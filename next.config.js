/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,

  basePath: isVercel ? '' : (isProd ? '/GalSkill' : ''),

  env: {
    NEXT_PUBLIC_INDEX_BASE_URLS: isProd
      ? '["https://galskill-data.vercel.app/index", "https://fastly.jsdelivr.net/gh/Chizer77/GalSkill@data/index", "https://cdn.jsdelivr.net/gh/Chizer77/GalSkill@data/index","https://cdn.statically.io/gh/Chizer77/GalSkill/data/index"]'
      : '["/upload/deploy/index"]',

    NEXT_PUBLIC_INFO_BASE_URLS: isProd
      ? '["https://galskill-data.vercel.app/info", "https://fastly.jsdelivr.net/gh/Chizer77/GalSkill@data/info", "https://cdn.jsdelivr.net/gh/Chizer77/GalSkill@data/info","https://cdn.statically.io/gh/Chizer77/GalSkill/data/info"]'
      : '["/upload/deploy/info"]',
  }
}

module.exports = nextConfig