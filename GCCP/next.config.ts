import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",  // Required for GitHub Pages (creates an 'out' folder)
  
  // IMPORTANT: This must match your repository name exactly
  basePath: "/GCCP_Repo", 

  images: {
    unoptimized: true, // Required because GitHub Pages cannot optimize images on the fly
  },
};

export default nextConfig;