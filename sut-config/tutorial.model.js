const mongoose = require("mongoose");

const TutorialSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    published: Boolean
  },
  { timestamps: true }
);

TutorialSchema.method("toJSON", function () {
  const { __v, _id, ...object } = this.toObject();
  object.id = _id;
  return object;
});

module.exports = mongoose.model("Tutorial", TutorialSchema);
