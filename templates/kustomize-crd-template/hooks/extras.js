const fs = require("fs");
const path = require("path");

// It is not possible in the React renderer to conditionally render
// a file if it already exists. Therefor we just check if the files
// exist in this post run hook and, if not, copy them over.
module.exports = {
  "generate:after": generator => {
    const extraFiles = ["kustomization.yaml"];

    for (const f of extraFiles) {
      const source = path.join(generator.templateDir, "extras", f);
      const target = path.join(generator.targetDir, f);

      if (!fs.existsSync(target)) {
        fs.copyFileSync(source, target);
      }
    }
  },
};
