# Macro plan — Large Transfer, iteración 2

Estado: propuesta, pendiente de aprobación
Contexto previo: `docs/specs/large-transfer-scan-reliability/spec.md` (iteración 1, commit `1dbaa61`)

---

## 1. Objetivo

Hoy Large Transfer es usable hasta ~70 KB y se degrada mal por encima. El objetivo de la
iteración 2 no es "que ande más rápido" sino **quitar los dos techos que hacen que el tiempo de
transferencia crezca peor que linealmente con el tamaño**:

1. **Techo de captura** — la probabilidad de que una captura individual decodifique es baja
   (27 % medido). Todo lo demás se multiplica por este número.
2. **Techo de cola (long tail)** — con el loop circular, cuando faltan pocos chunks casi todos los
   frames mostrados son inútiles y hay que esperar una vuelta completa por cada uno.

Meta cuantificable: **300 KB en menos de 90 s en Balanced, en Android y en iOS**, sin cambiar la
filosofía del proyecto (sin backend, sin red, sin persistencia de contenido).

---

## 2. Validación del relevamiento

Revisé cada punto del reporte contra el código actual y contra las fuentes de
`html5-qrcode@2.3.8`. Resumen:

| #   | Afirmación del reporte                                        | Veredicto                                            | Nota                                                                                                 |
| --- | ------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | El long tail es estructural, bajar la velocidad no lo arregla | **Correcto**                                         | Confirmado en `ChunkCollector` + loop circular de `useFrameLoop`                                     |
| 2   | Medir _effective throughput_, no FPS                          | **Correcto y ya hecho**                              | `scanStats.ts` de la i1 mide exactamente eso                                                         |
| 3   | Usar `requestVideoFrameCallback` en vez de polling            | **Correcto en el fondo, imposible hoy**              | Requiere reemplazar el loop de captura de html5-qrcode (ver §3.1)                                    |
| 4   | Un decode en vuelo, descartar frames viejos                   | **Ya es así**                                        | `foreverScan` encadena el próximo `setTimeout` _después_ del decode; no hay cola                     |
| 5   | ROI: no analizar toda la cámara                               | **Ya hecho, y achicarlo más sería contraproducente** | Ver §2.1 — corrige lo que te dije antes                                                              |
| 6   | `BarcodeDetector` como fast-path                              | **Correcto y de alto valor**                         | Hoy html5-qrcode _alterna_ nativo/ZXing tick a tick y no se puede forzar (`code-decoder.js:101-111`) |
| 7   | Ajustar cámara según `getCapabilities()`                      | **Parcial**                                          | La i1 ya negocia 1080p; el problema no es la cámara (ver §2.1)                                       |
| 8   | QR quieto, sin transitions, alto contraste, quiet zone        | **Casi todo ya está; la quiet zone no**              | Ver §2.2                                                                                             |
| 9   | FEC / Reed-Solomon por grupos                                 | **Correcto**                                         | Ataca el long tail sin canal de retorno                                                              |
| 10  | Interleaving                                                  | **Correcto y barato**                                | Las pérdidas acá sí son correlacionadas (movimiento, foco, glare)                                    |
| 11  | Fountain codes / RaptorQ                                      | **Correcto, pero es la opción cara**                 | Domina a RS si se hace bien; ver §5.4                                                                |
| 12  | ACK con bitset, no array de ids                               | **Correcto**                                         | 1000 chunks = 125 bytes                                                                              |
| 13  | ACK por WebRTC                                                | **Viable pero desproporcionado**                     | El signaling manual reintroduce el problema que la app resuelve                                      |
| 14  | ACK por Bluetooth                                             | **Descartar**                                        | Web Bluetooth es BLE/GATT, no browser↔browser                                                        |
| 15  | ACK por audio                                                 | **Viable y muy bien alineado**                       | Ver §5.4                                                                                             |

### 2.1. Hallazgo principal (y corrección de un análisis previo)

**El canvas que se decodifica está en píxeles CSS, no en píxeles de cámara.**

En `html5-qrcode`, `setupUi()` recibe `viewfinderWidth = element.clientWidth` y crea el canvas de
decodificación con ese tamaño (`html5-qrcode.js:485-518`). Después, `foreverScan()` hace:

```js
var widthRatio = videoElement.videoWidth / videoElement.clientWidth
this.context.drawImage(
  videoElement,
  sxOffset,
  syOffset,
  sWidthOffset,
  sHeightOffset, // origen: región en px de cámara
  0,
  0,
  this.qrRegion.width,
  this.qrRegion.height, // destino: px CSS
)
```

Es decir: recorta bien la región en píxeles nativos, pero **la baja a resolución de pantalla antes
de decodificar**. Consecuencias:

- Pedir 1920×1080 a la cámara **no aumenta la resolución que ve el decoder**. Solo mejora
  levemente la calidad del downsample. El `video 1080x1920` que viste en el overlay es real, pero
  no es lo que se decodifica.
- El presupuesto real hoy, en un teléfono en portrait:

  ```
  ancho del panel      ~350 px CSS
  qrbox 95 %           ~330 px  → canvas 330 × 330
  símbolo v22          105 módulos + 4 de quiet zone = 109
  ───────────────────────────────────────────────
  ~3.0 píxeles por módulo
  ```

  ZXing necesita ~3 px/módulo como piso absoluto y trabaja cómodo en 4-5. **Estamos justo en el
  borde del acantilado**, y eso explica el 27 % mucho mejor que cualquier otra hipótesis.

**Corrección explícita:** después de la medición en dispositivo te recomendé achicar el `qrbox` a
~60 % "porque se analizan ~1.05 M píxeles por captura". Eso estaba mal: se analizan ~110 k píxeles,
y achicar el `qrbox` **bajaría los px/módulo de 3.0 a ~1.9, rompiendo el scanner**. No hay que
achicar el ROI: hay que subir la resolución del canvas. Ignorá esa recomendación.

Esto reordena el plan: **la palanca de mayor impacto disponible no es FEC, es tomar control del
pipeline de captura** para decodificar a la resolución correcta.

### 2.2. Hallazgo secundario: quiet zone fuera de norma

`qrFrames.ts` usa `MARGIN = 2`. El estándar QR pide **4 módulos**. Con menos, muchos detectores
fallan al ubicar los patrones de posición cuando el símbolo está cerca del borde de la pantalla.

No es un cambio gratis: subir a 4 agrega 4 módulos al lado, lo que **baja** los px/módulo un ~3.5 %
con el canvas actual. Por eso va junto con §4.1, no antes.

### 2.3. Aritmética del problema a 70 KB

```
70 KB @ 550 B/chunk  = 128 frames de datos + header = 129 frames
129 frames @ 300 ms  = 38.7 s por vuelta completa
decode rate 27 %, ~1.7 decodes/s  → ~50 % de los frames por vuelta (con duplicados)
coupon collector, p≈0.5           → ~7 vueltas ≈ 4.5 minutos
```

A 300 KB serían ~550 frames, ~165 s por vuelta, ~20 minutos. **El problema no es lineal.** Las dos
patas del plan (subir `p`, y eliminar la necesidad de vueltas completas) atacan cada factor.

---

## 3. Qué NO vamos a hacer, y por qué

- **`requestVideoFrameCallback` sobre el scanner actual**: no hay punto de extensión.
  `foreverScan` es privado y agenda su propio `setTimeout`. Se obtiene gratis en la etapa 1, que
  reemplaza ese loop.
- **Achicar el `qrbox`**: ver §2.1.
- **WebRTC**: el signaling manual (offer por QR, answer por QR) reintroduce un pairing de dos
  pasos para resolver un problema que FEC resuelve sin pairing. Si algún día se hace, es después
  de tener el canal de ACK abstracto de la etapa 5.
- **Web Bluetooth**: fuera de alcance técnico (BLE/GATT, no peer browser).
- **Subir `fps` o bajar `frameMs`**: ya están en el límite útil; el cuello es el decode.

---

## 4. El plan

Cinco etapas. Las etapas 1 y 2 no tocan el protocolo (siguen QRTransfer v2) y son las que
recomiendo hacer primero. La 3 introduce v3. Las 4 y 5 son opcionales y dependen de lo que midan
las anteriores.

Cada etapa termina con una medición en Android y iOS reales usando el overlay `?debug=1` de la
iteración 1, guardada en `docs/specs/`. **La medición es el entregable de cada etapa**, no el
código.

---

### Etapa 1 — Pipeline de captura propio

**Objetivo:** subir el decode rate de 27 % a >70 % subiendo los píxeles por módulo.

**Spec.** Reemplazar `Html5Qrcode` en `TransferScanner` por un módulo propio, con la misma
superficie pública que hoy consume el componente (start / stop / callbacks de éxito y error), de
modo que la unión discriminada de estado y el ciclo de vida de cámara (`finished` + contador
`session` + `stopScanner`) **no cambien**.

El módulo nuevo (`src/lib/scan/`, puro salvo por el acceso a DOM/media):

- `getUserMedia` con los constraints que ya construye `buildScanConfig`.
- `video.requestVideoFrameCallback()` cuando existe; `requestAnimationFrame` como fallback
  (Firefox no lo implementa).
- **Un decode en vuelo**: si llega un frame nuevo mientras se decodifica, se descarta. Nunca cola.
- Canvas de decodificación dimensionado en **píxeles de cámara**, recortando un ROI centrado
  cuadrado. El tamaño del ROI se elige por un objetivo de píxeles por módulo, no por un porcentaje
  del viewfinder.
- Decoder detrás de una interfaz `Decoder { decode(bitmap): Promise<string|null> }`, con dos
  implementaciones: `BarcodeDetector` nativo cuando `'BarcodeDetector' in window`, y ZXing como
  fallback. **Sin alternancia**: si el nativo está, se usa siempre.

**Comentario sobre el trade-off central.** Subir la resolución sube el costo del decode. Hoy:
110 k px → ~103 ms. Con ZXing el costo es aproximadamente lineal en píxeles, así que un canvas de
550×550 (≈5 px/módulo) costaría ~290 ms. Eso baja las capturas/s de 6.4 a ~3.2, pero si el éxito
sube de 27 % a 80 % los decodes útiles/s pasan de 1.7 a ~2.6. Es una mejora, pero modesta.

**Por eso `BarcodeDetector` no es un "nice to have" en esta etapa, es la mitad del punto.** El
detector nativo está acelerado por hardware y típicamente cuesta un orden de magnitud menos que
ZXing en JS. Con nativo, 550×550 debería costar ~20-40 ms, y ahí sí los decodes/s se multiplican.

**Recomendación:** hacer el ROI **adaptativo y medido, no fijado a ojo**. El receptor conoce el
`total` del header y, tras el primer decode exitoso, puede estimar la versión del símbolo. Una
implementación honesta y simple: empezar con un ROI grande, y una vez que hay un decode, ajustar el
ROI al bounding box detectado más un margen. `BarcodeDetector` devuelve `boundingBox`; ZXing
también expone los puntos de resultado. Si eso resulta frágil, la alternativa es un ROI fijo
calculado para 5 px/módulo asumiendo el peor caso de versión del perfil (`MAX_QR_VERSION`).

**Alternativas evaluadas y descartadas:**

- _Parchear html5-qrcode con un fork_: menos código, pero heredamos la alternancia de decoders y
  el `setTimeout`, que son dos de los tres problemas.
- _Sólo subir el tamaño CSS del viewfinder_: mejora los px/módulo sin escribir un pipeline, y es
  una prueba de 10 minutos que vale la pena hacer **antes** de comprometerse con esta etapa, como
  validación barata de la hipótesis de §2.1. Pero topea en el ancho de pantalla del dispositivo.

**Riesgo:** es la etapa con más superficie de regresión (permisos de cámara, orientación, iOS
Safari con `playsinline`, liberación del stream). Mitigación: mantener html5-qrcode en
`QRScanner` (Quick QR) intacto — sólo migra `TransferScanner`.

**Criterio de salida:** decode rate >70 % y decodes útiles/s ≥ 2× el valor actual, en ambos SO.

---

### Etapa 2 — Correcciones del emisor y micro-ajustes

**Objetivo:** cerrar los defectos baratos que quedaron, ahora que hay presupuesto de px/módulo para
absorberlos.

**Spec.**

- `qrFrames.ts`: `MARGIN` de 2 a **4** (quiet zone según norma).
- Re-derivar los `chunkSize` de los perfiles contra el nuevo presupuesto de px/módulo medido en la
  etapa 1, con el test de densidad que ya existe en `profiles.test.ts`. Si la etapa 1 rinde, acá
  se puede **subir** la densidad y recuperar throughput.
- Verificar que el `<img>` del loop no tenga transiciones CSS ni composición que introduzca
  interpolación temporal entre frames.
- Considerar exponer un modo pantalla completa fondo blanco puro para el emisor.

**Comentario:** esta etapa es deliberadamente pequeña y va **después** de la 1, porque cada uno de
estos cambios consume o libera px/módulo y sólo tiene sentido calibrarlos contra el presupuesto
real, no contra el actual.

**Criterio de salida:** ninguna regresión respecto de la etapa 1, y el chunk size máximo que
sostiene el decode rate objetivo.

---

### Etapa 3 — FEC: paridad Reed-Solomon con interleaving (protocolo v3)

**Objetivo:** eliminar la espera por chunks individuales. Es la etapa que hace que 300 KB sea
viable.

**Spec.**

- Bump a `QRT3`. `detectProtocolVersion` ya existe para explicarle al usuario que el emisor es
  incompatible; hay que agregar el caso inverso (receptor viejo).
- Los bytes de transferencia se dividen en **bloques** de K chunks; por cada bloque se generan R
  chunks de paridad Reed-Solomon (arrancar con K=10, R=2, es decir 20 % de overhead, y hacerlo
  parametrizable por perfil).
- El header lleva K y R. Los frames de datos y de paridad se distinguen por un campo nuevo.
- **Interleaving**: el orden de emisión no es por bloque sino intercalado entre bloques, para que
  una pérdida correlacionada de 500 ms (movimiento, refoco, glare) no se coma un bloque entero.
- El receptor reconstruye un bloque en cuanto tiene K de los K+R símbolos de ese bloque.

**Comentario sobre el impacto en el código.** Esta es la etapa con mayor impacto estructural, pero
está bien contenida: `src/lib/transfer/` es TypeScript puro sobre `Uint8Array` sin React, y los
módulos ya están separados por responsabilidad. Concretamente:

- Nuevo `src/lib/transfer/fec.ts` (puro, testeable exhaustivamente sin cámara).
- `chunking.ts` gana el concepto de bloque; `protocol.ts` gana el tipo de frame de paridad;
  `transfer.ts` cambia `buildTransfer` y `ChunkCollector`.
- La UI **no cambia**: `total`, `received` y el progreso siguen significando lo mismo.

**Recomendación:** no escribir el codec Reed-Solomon a mano. Es matemática de campo de Galois donde
un error sutil produce corrupción silenciosa. Evaluar una dependencia chica y auditada; si no
aparece ninguna aceptable para el criterio de dependencias del proyecto, entonces sí implementarlo,
pero con vectores de prueba conocidos.

**Alternativa evaluada:** saltar directo a fountain codes (etapa 5). Reed-Solomon primero es la
decisión correcta porque es **depurable**: "faltan 3 de 12 en el bloque 7" es un estado que se
puede inspeccionar; un decoder LT en un estado intermedio, no. Además el overhead de RS es
determinista y el de un fountain code no.

**Riesgo:** el overhead de paridad es puro costo si el canal ya es bueno. Con 20 % de paridad, una
transferencia que hoy sale en una vuelta tardaría 20 % más. Mitigación: **R configurable por
perfil** — Fast con más paridad, Reliable con menos, o incluso paridad emitida sólo a partir de la
segunda vuelta (los frames de paridad se muestran únicamente cuando el loop ya dio una vuelta,
donde son gratis porque las repeticiones serían duplicados de todos modos). **Esta última variante
me parece claramente la mejor y la recomiendo evaluar primero**: hace que FEC no tenga costo alguno
en el caso feliz.

**Criterio de salida:** 300 KB en Balanced en menos de 90 s, y la desaparición del patrón "falta
1 chunk, espero una vuelta entera".

---

### Etapa 4 — Adaptación en vivo (sin canal de retorno)

**Objetivo:** que el usuario no tenga que elegir el perfil correcto.

**Spec.** El emisor no sabe nada del receptor, pero **el receptor sí sabe todo de sí mismo**. Con
las estadísticas que ya produce `scanStats.ts` (promovidas de diagnóstico a insumo de producto), el
receptor puede mostrar al usuario, en lenguaje llano, qué está pasando: "la señal es débil, acercá
el teléfono" / "probá el perfil Reliable". Esto es barato y no requiere protocolo.

**Recomendación:** hacer esta etapa **antes** que la 5. Es la que mejor relación
valor/complejidad tiene de las dos últimas, y no compromete ninguna decisión arquitectónica.

**Comentario:** acá es donde hay que decidir si el overlay de debug se convierte en superficie de
producto. Si lo hace, sus strings entran a `i18n.ts` en `en` y `es` — hoy están hardcodeados en
inglés justamente porque son inalcanzables sin `?debug=1`. Esa decisión quedó abierta en el
code-review de la iteración 1 y esta etapa la cierra.

---

### Etapa 5 — Canal de retorno, o fountain codes (elegir uno)

Las dos opciones resuelven el mismo problema residual y **no conviene hacer ambas**. Cuál elegir
depende enteramente de lo que midan las etapas 1-3.

**Opción A — ACK por audio.** El receptor emite periódicamente por el parlante un paquete chico
(`transferId` + bitset de recibidos + CRC) que el emisor escucha por el micrófono; el emisor
reordena la cola para mostrar sólo lo que falta. Encaja muy bien con la geometría del caso de uso
(pantalla → cámara trasera, parlante → micrófono) y no necesita pairing, servidor ni red.

_Recomendación si se hace:_ empezar con FSK audible y un bitrate ridículamente bajo (100-500 B/s
alcanza de sobra), validar el concepto, y recién después considerar ultrasonido. Diseñarlo como
**optimización opcional**: si el ACK no llega, el sistema sigue funcionando exactamente como en la
etapa 3.

_Riesgo:_ permisos de micrófono en el emisor, ruido ambiente, y iOS Safari con restricciones de
audio. Es la etapa más incierta del plan.

**Opción B — Fountain codes (RaptorQ o LT).** Elimina el long tail por construcción: el emisor
genera símbolos codificados indefinidamente y el receptor reconstruye con cualquier subconjunto
suficientemente grande. Matemáticamente es la respuesta correcta para un canal QR sin retorno.

_Riesgo:_ complejidad e imposibilidad de depurar estados intermedios. Sólo se justifica si después
de la etapa 3 el long tail sigue siendo el cuello de botella dominante.

**Recomendación:** decidir esto con datos, no ahora. Si tras la etapa 3 el problema restante es
_"el canal es bueno pero pierdo tiempo mostrando frames que ya tengo"_ → opción A. Si es _"pierdo
frames de forma impredecible y la paridad fija no alcanza"_ → opción B.

---

## 5. Secuencia recomendada de PRs

Las etapas 0, 0.5 y 0.6 son preparatorias y están detalladas en §7. El detalle de estado vive en la
tabla de tracking de §8.

| Etapa                                | PRs                                             | Toca protocolo | Riesgo | Prioridad                             |
| ------------------------------------ | ----------------------------------------------- | -------------- | ------ | ------------------------------------- |
| 0. Validar la hipótesis de px/módulo | 1 chico                                         | no             | nulo   | **hacer ya**                          |
| 0.5. Emprolijado previo (§7.1-7.3)   | 1 chico                                         | no             | bajo   | **alta — abre el seam de la etapa 1** |
| 0.6. Doc de arquitectura (§7.6)      | 1 chico                                         | no             | nulo   | media                                 |
| 1. Pipeline de captura propio        | 3-4 (módulo de scan, decoders, cableado, tests) | no             | alto   | **alta**                              |
| 2. Emisor y micro-ajustes            | 1-2                                             | no             | bajo   | alta                                  |
| 3. FEC Reed-Solomon + interleaving   | 3-4 (fec puro, protocolo v3, sender, receiver)  | **sí (v3)**    | medio  | alta                                  |
| 4. Adaptación en vivo                | 1-2                                             | no             | bajo   | media                                 |
| 5. ACK por audio _o_ fountain codes  | 4+                                              | según opción   | alto   | a decidir con datos                   |

---

## 6. Primera etapa recomendada

**Etapa 0 → etapa 0.5 → etapa 1**, en ese orden.

La **etapa 0** son unas horas: agrandar el contenedor del viewfinder en el receptor y volver a medir
con `?debug=1`. Si el decode rate sube de forma marcada sólo por eso, la hipótesis de §2.1 queda
confirmada en dispositivo real y la etapa 1 pasa de ser una apuesta a ser una certeza. Si no sube,
la hipótesis está mal y hay que rediagnosticar **antes** de escribir un pipeline de captura.

La **etapa 0.5** va después de la 0 y antes de la 1 por una razón concreta: la etapa 1 reescribe la
mitad imperativa de `TransferScanner.tsx`, y hoy eso sería cirugía sobre un componente de 379 líneas
con riesgo de romper el ciclo de vida de cámara de paso. Extraer antes el hook convierte la etapa 1
en un reemplazo de implementación detrás de un contrato estable. Es el único emprolijado que se paga
solo dentro del plan; el detalle y el resto de las opciones están en §7.

No arrancaría por FEC. FEC multiplica la eficiencia de un canal; si el canal entrega 27 %, FEC
sobre 27 % sigue siendo lento. Primero el canal, después el código de corrección.

---

## 7. Emprolijado previo: qué conviene refactorizar y qué no

La arquitectura actual está sana: `src/lib/transfer/` es TypeScript puro sin React, los módulos
están separados por responsabilidad y el estado del emisor y del receptor son uniones discriminadas.
**No hace falta un refactor grande.** Lo que sigue es el conjunto mínimo que conviene hacer _antes_
de la etapa 1, con el criterio de que cada cambio se pague solo dentro del macro plan.

### 7.1. El único refactor que recomiendo: extraer el seam de escaneo

`TransferScanner.tsx` tiene 379 líneas y hace cuatro cosas: ciclo de vida de cámara, acumulación de
frames del protocolo, instrumentación de debug y tres presentaciones distintas. Es **Divergent
Change** de manual: cambia por razones no relacionadas entre sí.

Lo importante no es la prolijidad: **la etapa 1 reescribe exactamente la mitad imperativa de este
archivo**. Hoy eso sería cirugía sobre un componente de 379 líneas, con el riesgo de romper el
ciclo de vida de cámara de paso. Con el seam extraído, la etapa 1 pasa a ser _reemplazar la
implementación detrás de un contrato estable_, y el componente ni se entera.

**Propuesta.** Un hook `useTransferScanner` en su propio `.ts` (obligado por
`react-refresh/only-export-components`, igual que `usePreparedPayload.ts` junto a `SendFlow.tsx`),
que concentra todo lo imperativo y expone un contrato declarativo:

```ts
interface TransferScannerApi {
  state: ReceiverState
  cameras: CameraDevice[]
  selection: CameraSelection | null
  stats: ScanStatsSnapshot | null
  selectCamera(selection: CameraSelection): void
  restart(): void
}
```

`TransferScanner.tsx` queda como render puro de `state`. **Ese contrato es el entregable del
refactor**: es lo que la etapa 1 no va a tener que tocar.

Costo estimado: 1 PR chico, sin cambios de comportamiento, cubierto por la regresión manual de
cámara que ya está documentada en el spec de la iteración 1.

### 7.2. Separación de archivos

- `ScanDebug` → `ScanDebug.tsx`. Es un instrumento de diagnóstico viviendo dentro de un componente
  de producto; además va a crecer en la etapa 4.
- `ReceiveProgress` → `ReceiveProgress.tsx`. Presentacional puro, sin relación con el escaneo.

Con esto `TransferScanner.tsx` baja a ~120 líneas declarativas.

### 7.3. Declarativo: matar la lista de campos duplicada

El code-review de la iteración 1 dejó abierto que `formatScanReport` (en `scanStats.ts`) y el JSX de
`ScanDebug` enumeran los mismos campos en dos lugares, en el mismo orden, a mano. Es **Duplicated
Code** y ya se desincronizó una vez.

La forma declarativa: una sola tabla de campos, derivada del snapshot, consumida por los dos.

```ts
const SCAN_FIELDS: readonly ScanField[] = [
  {
    label: 'video',
    render: (s) =>
      s.resolution === null ? 'unknown' : `${s.resolution.width}×${s.resolution.height}`,
  },
  { label: 'decode rate', render: (s) => `${(s.decodeRate * 100).toFixed(1)}%` },
  // …
]
```

El reporte de texto es un `map` + `join`; el overlay es un `map` a `<dt>/<dd>`. Agregar una métrica
en la etapa 1 pasa a ser una línea en vez de dos ediciones coordinadas.

### 7.4. Patrones de diseño: cuáles aplican y cuándo

Dos encajan genuinamente, y **los dos pertenecen a la etapa 1, no a este emprolijado**:

- **Strategy** para el decoder — `BarcodeDetector` nativo vs. ZXing detrás de una interfaz común.
- **Adapter** para la fuente de captura — `requestVideoFrameCallback` con fallback a
  `requestAnimationFrame`.

**Recomendación explícita: no crearlos ahora.** Introducir una interfaz `Decoder` con una sola
implementación, antes de tener el segundo caso real, es Speculative Generality: se termina
diseñando el contrato equivocado porque todavía no se sabe qué necesita el nativo. El momento
correcto de extraer la abstracción es cuando aparece el segundo implementador, dentro de la etapa 1.

Lo que sí conviene dejar definido ahora es _dónde_ van a vivir: `src/lib/scan/`, con la misma regla
que `src/lib/transfer/` — lógica pura y testeable separada del acceso a DOM/media.

### 7.5. Comentarios

El código actual es deliberadamente comentado, y ahí hay una tensión real con la preferencia de
minimizar comentarios. Mi lectura, para que quede como criterio y no como gusto:

- **Los comentarios que explican _por qué_ se quedan.** El hallazgo de §2.1 es el caso testigo:
  nada en el código deja ver que el canvas está en píxeles CSS, y sin ese comentario alguien va a
  "arreglar" el `qrbox` en seis meses y romper el scanner. Lo mismo con la identidad de cámara
  dentro de `videoConstraints`, o `image-rendering: auto`.
- **Los que reformulan _qué_ hace el código se borran.** Ejemplos actuales:
  `// No QR code in this capture; keep scanning.`, `/** Frames received so far, header included. */`
  sobre un getter llamado `received`.
- **Los docblocks de cabecera de módulo se quedan**, pero acotados a la decisión de diseño, no a
  reexplicar el flujo que ya está en `docs/large-transfer.md`.

Esto no amerita un PR propio: se aplica al pasar por cada archivo.

### 7.6. Qué agregar a la doc de arquitectura

`docs/technical-overview.md` describe bien los componentes pero no las **reglas** que los mantienen
así — hoy viven sólo en `CLAUDE.md`, que es para agentes, no para una persona leyendo el proyecto.
Propongo una sección corta `## Conventions` con lo que ya se respeta de hecho:

1. `src/lib/**` es puro y sin React; los componentes no contienen lógica de protocolo.
2. Los hooks viven en `.ts` propios, nunca en un `.tsx` que exporta componentes.
3. El estado de flujos multi-paso es una unión discriminada, nunca banderas booleanas.
4. Todo string visible entra a `en` y `es`; las superficies de debug (`?debug=1`) están exentas y
   se rotulan en inglés técnico.
5. Los comentarios explican por qué, no qué.
6. Los números técnicos viven en `config.ts` / `profiles.ts`, nunca en componentes.

Y un `## Decisions` con una línea por decisión no obvia y su motivo, que es donde el hallazgo de
§2.1 debería quedar registrado para que no se vuelva a perder.

### 7.7. Qué NO tocar

- `src/lib/transfer/` (salvo lo que pida la etapa 3). Está bien factorizado y con buena cobertura.
- El ciclo de vida de cámara (`finished` + contador `session` + `stopScanner`), más allá de mudarlo
  al hook sin cambios. Está así porque cubre carreras reales.
- `QRScanner` / Quick QR. Fuera del alcance del macro plan.
- Las uniones discriminadas de `SendFlow` y del receptor.

### 7.8. Veredicto

**Sí conviene emprolijar, pero poco y con un objetivo concreto.** Un PR (§7.1 + §7.2 + §7.3) más
una actualización de doc (§7.6). No es un refactor arquitectónico: es abrir el seam que la etapa 1
necesita, y de paso cerrar los dos hallazgos que dejó abiertos el code-review de la iteración 1.

Si tuviera que recortar aún más: **§7.1 es el único imprescindible.** El resto es barato pero
posponible.

---

## 8. Tracking del macro plan

Estado: `pendiente` · `en curso` · `hecho` · `descartado`

| #   | Etapa                                   | Alcance                                                                                                                      | Protocolo   | Riesgo   | Estado    | Medición / criterio de salida                                            |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | --------- | ------------------------------------------------------------------------ |
| 0   | Validación de la hipótesis de px/módulo | Agrandar el viewfinder del receptor y re-medir con `?debug=1`                                                                | no          | nulo     | pendiente | ¿Sube el decode rate sólo por esto?                                      |
| 0.5 | Emprolijado previo                      | §7.1 hook `useTransferScanner` + §7.2 archivos + §7.3 campos declarativos                                                    | no          | bajo     | pendiente | Sin cambios de comportamiento; regresión manual de cámara OK             |
| 0.6 | Doc de arquitectura                     | §7.6 `Conventions` + `Decisions` en `technical-overview.md`                                                                  | no          | nulo     | pendiente | Hallazgo §2.1 registrado                                                 |
| 1   | Pipeline de captura propio              | `src/lib/scan/`, `requestVideoFrameCallback`, canvas en px de cámara, Strategy de decoder, `BarcodeDetector` sin alternancia | no          | **alto** | pendiente | Decode rate > 70 % y decodes útiles/s ≥ 2× actual, en Android e iOS      |
| 2   | Emisor y micro-ajustes                  | `MARGIN` 2 → 4, re-derivar `chunkSize`, verificar transiciones CSS                                                           | no          | bajo     | pendiente | Sin regresión vs. etapa 1; chunk size máximo que sostiene el objetivo    |
| 3   | FEC Reed-Solomon + interleaving         | `src/lib/transfer/fec.ts`, protocolo v3, paridad recién en la 2ª vuelta                                                      | **sí (v3)** | medio    | pendiente | 300 KB en Balanced en < 90 s; desaparece el "falta 1, espero una vuelta" |
| 4   | Adaptación en vivo                      | Promover `scanStats` a insumo de producto; guía al usuario; i18n del overlay                                                 | no          | bajo     | pendiente | El usuario no necesita elegir perfil a mano                              |
| 5A  | ACK por audio                           | FSK audible, bitset + CRC, reordenamiento de la cola del emisor                                                              | sí          | alto     | pendiente | _Sólo si tras la etapa 3 el cuello es mostrar frames ya recibidos_       |
| 5B  | Fountain codes                          | RaptorQ / LT                                                                                                                 | sí          | alto     | pendiente | _Sólo si tras la etapa 3 el cuello es pérdida impredecible_              |

**5A y 5B son excluyentes.** La elección se hace con la medición de la etapa 3, no antes.

### Mediciones acumuladas

| Fecha   | Etapa | Dispositivo | Perfil   | Resolución | Captures/s | Decodes/s | Decode rate | Tiempo total | Nota                              |
| ------- | ----- | ----------- | -------- | ---------- | ---------- | --------- | ----------- | ------------ | --------------------------------- |
| 2026-08 | i1    | Android     | Balanced | 1080×1920  | 6.4        | 1.7       | 27.0 %      | —            | Medición base tras la iteración 1 |
|         | 0     |             |          |            |            |           |             |              |                                   |
|         | 1     |             |          |            |            |           |             |              |                                   |
|         | 2     |             |          |            |            |           |             |              |                                   |
|         | 3     |             |          |            |            |           |             |              |                                   |
