const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/user");
const router = new express.Router();
const multer = require("multer");
const sharp = require("sharp");
const { sendWelcomeEmail, sendGoodbyeEmail } = require("../emails/account");

// create new user / sign up
router.post("/users", async (req, res) => {
  const user = new User(req.body);
  try {
    const token = await user.generateAuthToken();
    //res.send({ user, token });
    await user.save();
    sendWelcomeEmail(user.email, user.name); // This returns a promise but in here is not necessary to wait the email
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

// login
router.post("/users/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();

    res.send({ user, token });
  } catch (error) {
    res.status(400).send();
  }
});

// log out
router.post("/users/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send();
  } catch (error) {
    res.status(500).send(error);
  }
});

// log out all sessions
router.post("/users/logoutAll", auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send();
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/users/me", auth, async (req, res) => {
  res.send(req.user);
});

router.patch("/users/me", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "email", "password", "age"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send("Error: Invalid updates!");
  }
  try {
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();

    res.send(req.user);
  } catch (error) {
    res.status(400).send();
  }
});

router.delete("/users/me", auth, async (req, res) => {
  try {
    sendGoodbyeEmail(req.user.email, req.user.name);
    await req.user.remove();
    res.send(req.user);
  } catch (error) {
    res.status(500).send();
  }
});

// Multer is middleware, in here yo can address restrictions to file uploads
const upload = multer({
  //dest: "avatars", // this would save the file ar root diretory named 'avatars'
  limits: {
    fileSize: 1000000, //in Bytes
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error("Please upload image document"));
    }
    cb(undefined, true);
  },
});

router.post(
  "/users/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 250, height: 250 })
      .png()
      .toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);
router.delete(
  "/users/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
  }
);

router.get("/users/:id/avatar", async (req, res) => {
  const user = await User.findById(req.params.id);
  try {
    if (!user || !user.avatar) {
      throw new Error();
    }
    res.set("Content-Type", "image/png");

    res.send(user.avatar);
  } catch (error) {
    res.status(500).send();
  }
});
module.exports = router;
