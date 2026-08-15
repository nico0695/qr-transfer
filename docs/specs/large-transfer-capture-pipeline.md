# Etapa 1 — Pipeline de captura propio

Estado: **completada y medida en dispositivo**
Padre: `macro-plan-i2.md` · Commits: `71aada3`, `f682dc5`, `94a60e6`, `9cb75fe`

---

## 1. Problema

El receptor de Large Transfer decodificaba el **27 %** de las capturas: de cada cuatro fotogramas
analizados, tres no producían nada. Todo lo demás del macro plan —FEC, ACK, fountain codes—
multiplica ese número, así que arreglar el canal iba primero.

La causa estaba verificada en la fuente de `html5-qrcode@2.3.8`: **el canvas que se decodifica se
dimensiona en píxeles CSS, no en píxeles de cámara**.
`RenderedCameraImpl.setupSurface()` (`camera/core-impl.js:168-171`) pasa
`surface.clientWidth`/`clientHeight` a `setupUi()` (`html5-qrcode.js:508-512`), que crea el canvas
con esas dimensiones; después `foreverScan()` (`html5-qrcode.js:562-571`) recorta la región correcta
en píxeles nativos pero **la baja a resolución de pantalla antes de decodificar**.

En un teléfono de 390 px eso dejaba ~3.0 píxeles por módulo para un símbolo de 105 módulos — el
piso por debajo del cual ningún decodificador funciona. Pedir 1080p a la cámara no cambiaba nada,
porque el cuello era el canvas.

## 2. Qué se hizo

| Commit    | Cambio                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `71aada3` | Extraer `useTransferScanner`. `TransferScanner.tsx` pasa de 379 a 89 líneas y queda como render puro; el contrato del hook es el seam que permitió reemplazar el motor sin tocar la UI. |
| `f682dc5` | `computeRoi` dimensiona el recorte en píxeles nativos y fija el tamaño de decodificación, apuntando a ~4.6 px/módulo.                                                                   |
| `94a60e6` | Decoder ZXing compilado a WebAssembly en un Worker, con el `.wasm` servido desde el propio bundle.                                                                                      |
| `9cb75fe` | Bucle de captura sobre `requestVideoFrameCallback` y cableado de todo, con fallback al motor anterior.                                                                                  |

Ajuste posterior de UI: visor cuadrado, guía de encuadre al 75 % derivada del mismo
`DEFAULT_CROP_RATIO` que usa el recorte, y realce verde que decae solo en 700 ms por cada frame
nuevo aceptado.

### Decisiones que vale la pena recordar

- **`BarcodeDetector` no se usa.** Está detrás de un flag desactivado por defecto desde Safari 17 y
  roto desde iOS 18 (WebKit #281848); Chrome iOS y Firefox iOS son WebKit. Con el requisito de
  Android e iOS indistinto, el motor WASM es el que define el rendimiento.
- **Los frames viajan como RGBA transferido, no como `ImageBitmap`.** `readBarcodes` no acepta
  `ImageBitmap`, y `ImageData` es su camino rápido. De paso evita `OffscreenCanvas`, que habría
  subido el piso a iOS 16.4.
- **El `.wasm` se sirve local.** Por defecto `zxing-wasm` lo resuelve contra jsDelivr en producción,
  lo que rompería una app cuyo punto es funcionar sin red. Los overrides se instalan al cargar el
  Worker, no en el primer decode, porque `readBarcodes` cae al default si corre antes de que haya
  overrides cacheados.
- **Las opciones del lector pesan tanto como el motor.** Todos los defaults de `zxing-wasm` optimizan
  precisión sobre velocidad (`tryHarder`, `tryRotate`, `tryInvert`, `tryDownscale` en `true`,
  `formats` vacío, `maxNumberOfSymbols` en 255). Todos apagados, con un test que falla si vuelven.

## 3. Medición en dispositivo

Android, perfil de 200 ms, transferencia de ~304 KB en 519 frames.

|                    | Antes (i1)         | Ahora              |      |
| ------------------ | ------------------ | ------------------ | ---- |
| decode rate        | 27.0 %             | **79.3 %**         | 2.9× |
| decodes/s          | 1.7                | **8.03**           | 4.7× |
| captures/s         | 6.4                | 10.12              | 1.6× |
| costo del decode   | ~103 ms (estimado) | **11 ms (medido)** | 9×   |
| píxeles por módulo | ~3.0               | 4.6                | 1.5× |

**Criterio de salida de la etapa: superado.** Pedía decode rate > 70 % y decodes útiles/s ≥ 2×; se
obtuvo 79.3 % y 4.7×.

Consistencia del reporte verificada: `attempts = decodes + failures` (1175 = 932 + 243),
`accepted + duplicates + ignored = decodes` (519 + 413 + 0 = 932), y `accepted` igual al total de
frames de la transferencia (519). `engine wasm`, o sea que no hubo fallback silencioso.

### El resultado que más importa

Una vuelta completa del emisor a 200 ms son `519 × 0.2 = 103.8 s`, y ése es el **mínimo teórico**
para ver los 519 frames distintos. Descontando 3.5 s de arranque de cámara y WASM, el escaneo
efectivo fue de 112.6 s:

```
vueltas hasta completar = 112.6 / 103.8 = 1.08     (óptimo = 1.00)
```

La transferencia se completó en **1.08 vueltas**. El patrón de "faltan pocos chunks y hay que
esperar otra vuelta entera", que era el problema que originó el macro plan, se redujo a 8 s sobre
116 s (7 %): entre los 108.0 s y los 113.5 s el receptor hizo 46 decodes sin ganar un solo frame
nuevo, esperando que el loop volviera a pasar por los que le faltaban.

## 4. Qué cambia esto para el resto del macro plan

Tres consecuencias, y las tres reordenan prioridades.

### El cuello de botella se mudó al emisor

El receptor lee **8.03 decodes/s** y el emisor muestra **5 frames/s**: se lee 1.6× más rápido de lo
que hay para leer. **Seguir optimizando la decodificación ya no compra nada.** La etapa 2 pasa de
ser un ajuste fino a ser la palanca principal: subir densidad (`chunkSize`) y/o bajar `frameMs`, que
ahora tienen margen medido para crecer.

### FEC vale menos de lo que suponíamos

El macro plan justificaba Reed-Solomon (etapa 3) sobre todo por la cola larga. Con la cola en el 7 %
del tiempo total, el techo de lo que FEC puede ahorrar en estas condiciones es pequeño, y su
overhead de paridad se paga sobre el 100 % de la transferencia. **La etapa 3 debería re-evaluarse
después de medir la etapa 2**, y la variante de emitir paridad recién en la segunda vuelta pasa de
recomendable a casi obligatoria.

### Hay un hueco en el instrumento

El tick medio es de 96 ms y el decode medido de 11 ms: **85 ms (89 %) sin explicar**. La
instrumentación no separa el intervalo entre frames de la cámara del costo de `drawImage` +
`getImageData`, así que no se puede distinguir "la cámara sólo entrega 10 fps a 1080p" de "el
manejo de píxeles cuesta 85 ms". Son diagnósticos opuestos: el primero no tiene arreglo del lado
del software y el segundo sí. Medir esto es requisito previo para la etapa 2.

Menor, pero anotado: **3.5 s de arranque** antes de la primera captura, entre el permiso de cámara,
`getUserMedia` y la compilación de ~1 MB de WASM.

## 5. Correcciones tras la review

Una review externa sobre el rango `1dbaa61..9cb75fe` encontró cuatro defectos reales, todos
corregidos antes del merge:

- **Un fallo de inicialización del WASM no activaba el fallback.** La promesa de `prepareZXingModule`
  queda memoizada rechazada, así que cada captura posterior volvía vacía y el receptor escaneaba
  para siempre sin decodificar. El fallback sólo se evaluaba al arrancar, antes de que la
  inicialización asíncrona terminara. Ahora el Worker anuncia `ready` o `init-error`, y
  `startCaptureLoop` espera esa señal antes de darse por arrancado.
- **Un Worker caído dejaba el escaneo bloqueado.** No había listeners de `error` ni `messageerror`,
  así que las promesas pendientes nunca se resolvían y la bandera de ocupado quedaba levantada:
  cámara encendida, frames llegando, todos descartados. Ahora cualquier camino que impida responder
  rechaza lo que esté en vuelo y libera el Worker.
- Un fallo de `listCameras()` abortaba una sesión que estaba escaneando bien y la reportaba como
  error de cámara; ahora sólo deja vacío el selector.
- **`measuredDecodeMs` promediaba únicamente los decodes fallidos**, porque la duración se
  descartaba en el camino exitoso. O sea que el "decode 11 ms" de la medición de arriba es el costo
  de _fallar_ un decode, no el costo medio real. Corregido; el número habrá que volver a tomarlo.

Verificado en navegador: un Worker roto ahora cae correctamente al motor legacy y sigue escaneando,
y un decode en vuelo al morir el Worker rechaza en vez de colgarse.

## 6. Pendiente

- **Medición en iOS.** Todo lo de arriba es un solo Android. iOS es donde no hay decoder nativo y
  donde `createImageBitmap` desde video tiene un bug de rendimiento abierto (WebKit #234920), así
  que es el caso que puede desmentir estos números.
- Comparación contra `?scanner=legacy` en el mismo teléfono y a la misma distancia.
- **Volver a medir `decode`**, que hasta esta corrección sólo muestreaba los fallos.
- Verificar que el visor cuadrado y la guía se vean bien en un teléfono real; se validaron con un
  stream sintético, no con una cámara.
