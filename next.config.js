/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,

  basePath: isProd ? '/GalSkill' : '',

  env: {
    NEXT_PUBLIC_INDEX_BASE_URL: isProd
      ? 'https://cdn.jsdelivr.net/gh/Chizer77/GalSkill@data/index'
      : '/upload/deploy/index',

    NEXT_PUBLIC_INFO_BASE_URL: isProd
      ? 'https://cdn.jsdelivr.net/gh/Chizer77/GalSkill@data/info'
      : '/upload/deploy/info',
  }
}

module.exports = nextConfig