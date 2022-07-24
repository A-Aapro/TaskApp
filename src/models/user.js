const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Task = require("../models/task");

// Mongoose makes plurals of models as collections to database
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("E-mail is invalid");
        }
      },
      trim: true,
      lowercase: true,
    },
    age: {
      type: Number,
      validate(value) {
        if (value < 0) {
          throw new Error("Age must be a positive number");
        }
      },
      default: 0,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minLength: 7,
      validate(value) {
        if (value.toLowerCase().includes("password")) {
          throw new Error("Password is invalid.");
        }
      },
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
    avatar: {
      type: Buffer,
    },
  },
  {
    timestamps: true,
  }
);

// mongoose makes the relation between task and user virtually behind the scenes
userSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "owner",
});

// generating authentication token with json web token - library
userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_KEY);
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// At user login, this checks if the email and passwords corrects
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Unable to login");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Unable to login");
  }
  return user;
};

// another mongoose behind the scenes thingy: before sending responds, there is toJSON -function and with this
// custom one we can access inside to object and make changes. In this case, deleting password and tokens to send back to client
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;
  return userObject;
};

// before "save" -function, let's hash the password
userSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// before deleting a user account, this function deletes all the user's tasks as well
userSchema.pre("remove", async function (next) {
  const user = this;
  await Task.deleteMany({ owner: user._id });
  next();
});
const User = mongoose.model("User", userSchema);

module.exports = User;
