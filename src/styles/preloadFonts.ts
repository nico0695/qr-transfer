import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import jetbrainsMonoLatin from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url'

function preload(href: string) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.crossOrigin = 'anonymous'
  link.href = href
  document.head.appendChild(link)
}

preload(interLatin)
preload(jetbrainsMonoLatin)
