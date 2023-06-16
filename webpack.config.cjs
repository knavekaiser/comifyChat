const path = require("path");

module.exports = {
  entry: "./src/comifyChat/index.jsx", // Entry point of the SDK
  output: {
    path: path.resolve(__dirname, "dist"), // Output directory
    filename: "comify-chat-sdk-v0.9.0.js", // Output filename
    library: "ComifyChat",
    libraryTarget: "umd",
    umdNamedDefine: true,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
};
