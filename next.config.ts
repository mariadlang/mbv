import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  /* config options here */
};

const botIdAvailable = process.env.MBV_VINEXT_BUILD !== "1";

export default botIdAvailable ? withBotId(nextConfig) : nextConfig;
