import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";
import webpack from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["cesium", "resium"],

  webpack: (config, { isServer }) => {
    // Prevent bundling ws native addons (bufferutil, utf-8-validate)
    // which cause "bufferUtil.mask is not a function" errors
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("bufferutil", "utf-8-validate");
      }
    }

    if (!isServer) {
      config.plugins?.push(
        new CopyPlugin({
          patterns: [
            { from: "node_modules/cesium/Build/Cesium/Workers", to: "../public/cesium/Workers" },
            { from: "node_modules/cesium/Build/Cesium/ThirdParty", to: "../public/cesium/ThirdParty" },
            { from: "node_modules/cesium/Build/Cesium/Assets", to: "../public/cesium/Assets" },
            { from: "node_modules/cesium/Build/Cesium/Widgets", to: "../public/cesium/Widgets" },
          ],
        }),
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify("/cesium"),
        })
      );
    }

    config.module?.rules?.push({
      test: /\.glsl$/,
      type: "asset/source",
    });

    return config;
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;
