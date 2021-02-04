var path = require('path');
export default {
    //input: path.resolve(__dirname, 'src'),
    input: "src/recoi.js",
    output: {
      file: './dist/recoi.min.js',
      format: 'umd'
    }
  };