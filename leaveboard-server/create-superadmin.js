import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import readline from "readline";
import { validateEmail, validatePassword } from "./utils/validation.js";

dotenv.config();

// ====== MongoDB Connection ======
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/digiflex";

await mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log("✅ Connected to MongoDB");

// ====== User Schema ======
const userSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
  },
  name: String,
  email: String,
  password: String,
  role: String,
  position: String,
  team: String,
  office: String,
  country: String,
  wfhWeekly: Number,
  leaveCounts: {
    sickLeave: Number,
    timeOff: Number,
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
}, {
    collection: 'user'
  }
);

const User = mongoose.model("User", userSchema);

// ====== Get User Input ======
const getUserInput = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const questions = [
      { prompt: 'Enter superadmin name: ', key: 'name' },
      { prompt: 'Enter superadmin email: ', key: 'email' },
      { prompt: 'Enter superadmin password (min 8 chars, letters, numbers, symbols): ', key: 'password' },
    ];

    const answers = {};
    let currentQuestion = 0;

    const askQuestion = () => {
      if (currentQuestion >= questions.length) {
        rl.close();
        resolve(answers);
        return;
      }

      const question = questions[currentQuestion];
      rl.question(question.prompt, (answer) => {
        answers[question.key] = answer.trim();
        currentQuestion++;
        askQuestion();
      });
    };

    askQuestion();
  });
};

// ====== Create Superadmin User ======
const createSuperadmin = async () => {
  try {
    const { name, email, password } = await getUserInput();

    // Validate input
    if (!name) {
      console.log("❌ Name is required");
      await mongoose.disconnect();
      process.exit(1);
    }

    const emailError = validateEmail(email);
    if (emailError) {
      console.log("❌", emailError);
      await mongoose.disconnect();
      process.exit(1);
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      console.log("❌", passwordError);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ User with this email already exists:", email);
      await mongoose.disconnect();
      process.exit(1);
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const superadminUser = new User({
      _id: new mongoose.Types.ObjectId(),
      name: name,
      email: email,
      password: hash,
      role: "superadmin",
      position: "Super Administrator",
      team: "Executives",
      office: "Bangkok",
      country: "Thailand",
      wfhWeekly: 1,
      leaveCounts: { sickLeave: 15, timeOff: 15 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });

    await superadminUser.save();
    console.log("✅ Superadmin user created successfully:");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Role:", superadminUser.role);
  } catch (err) {
    console.error("❌ Error creating superadmin:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

await createSuperadmin();
