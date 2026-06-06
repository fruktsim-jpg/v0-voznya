import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))



/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this project. Without it, Next walks up the tree
  // and can infer a parent/sibling directory as the root (the Python bot repo
  // sits next to this one), which breaks the Turbopack production build.
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig


