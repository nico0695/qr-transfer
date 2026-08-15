# Large Transfer

Large Transfer moves texts of a few KB up to hundreds of KB between devices using an animated
loop of QR codes. Everything runs client-side; nothing is stored or sent over the network.

## Pipeline

```
TEXT → UTF-8 → gzip → chunks (750 B) → protocol frames → QR images → animated loop
                                                                        ↓ camera
TEXT ← UTF-8 decode ← gunzip ← checksum check ← join ← collect/dedupe ← QR decode
```

- Compression uses the native `CompressionStream("gzip")` / `DecompressionStream("gzip")`.
- The **whole** compressed buffer is split into byte chunks; each chunk becomes one frame.
- Frames are pre-rendered as PNG data URLs once, then looped with `setInterval`.
- The receiver scans continuously (`html5-qrcode`), locks onto the first transfer id it sees,
  ignores other transfers and duplicates, and finishes automatically when every chunk is present.
- Success is only reported when the joined bytes match the checksum **and** decompress and decode
  cleanly. Otherwise: "Transfer could not be verified. Scan again."

## Protocol — QRTransfer v1

Each QR contains one ASCII string, fields separated by `|`:

```
QRT1|<transferId>|<index>|<total>|<compression>|<checksum>|<payload>
```

| Field         | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `QRT1`        | Magic `QRT` + protocol version `1`                           |
| `transferId`  | 8 Base64URL chars, random per transfer (48 bits)             |
| `index`       | 0-based chunk index (decimal)                                |
| `total`       | Number of chunks (decimal, ≥ 1)                              |
| `compression` | `g` = gzip                                                   |
| `checksum`    | First 16 hex chars of SHA-256 over the full compressed bytes |
| `payload`     | Base64URL (no padding) of this chunk                         |

QR decoders return text, so binary travels as Base64URL (~33 % overhead). With 750-byte chunks a
frame is ~1040 characters (QR version ≈ 26, error correction M).

## Limits and tunables (`src/lib/transfer/config.ts`)

| Constant              | Default                     | Meaning                                    |
| --------------------- | --------------------------- | ------------------------------------------ |
| `CHUNK_SIZE`          | 750 bytes                   | Payload per frame                          |
| `DEFAULT_FRAME_MS`    | 300 ms                      | Initial loop speed                         |
| `FRAME_MS_PRESETS`    | 500 / 400 / 300 / 250 / 200 | Speeds selectable in the UI                |
| `MAX_INPUT_BYTES`     | 2 000 000                   | Hard limit on UTF-8 input size             |
| `LARGE_BYTES`         | 100 000                     | Shows a non-blocking "Large transfer" note |
| `QR_ERROR_CORRECTION` | `M`                         | Error correction of the frames             |

## Code layout

- `src/lib/transfer/` — pure logic, no React: `encoding.ts`, `compression.ts`, `chunking.ts`,
  `checksum.ts`, `protocol.ts`, `transfer.ts` (pipeline + `ChunkCollector`), `formatDetection.ts`.
  Unit tests live next to each module (`npm test`).
- `src/components/large-transfer/` — UI: `LargeTransfer` (Send/Receive), `SendFlow`,
  `LargeTextEditor` (CodeMirror 6, also used read-only as the viewer), `ContentStats`,
  `TransferSummary`, `AnimatedQR`, `TransferScanner`, `ReceivedContent`.

## Not in scope (yet)

Fountain codes / cross-frame FEC, receiver acknowledgements, encryption, arbitrary files,
persistence, networking. The versioned protocol leaves room for these.
