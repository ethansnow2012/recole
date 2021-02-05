var path = require('path');
export default {
    //input: path.resolve(__dirname, 'src'),
    input: "src/recole.js",
    output: {
      name:"recole",
      file: './dist/recole.js',
      format: 'umd'
    }
  };