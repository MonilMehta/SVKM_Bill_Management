import User from "../models/user-model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendMail } from "../utils/send-mail.js";

dotenv.config();

// to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "10h" });
};

export const registerUser = async (req, res) => {
  const { name, email, password, contact_no, sap_id, role, region } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      contact_no,
      sap_id,
      role: Array.isArray(req.body.role) ? req.body.role : [req.body.role],
      region: Array.isArray(region) ? region : [region],
      // username,
    });

    await newUser.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        region: newUser.region,
        // username: newUser.username,
      },
      token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { emailOrUsername, password } = req.body;
  // console.log(emailOrUsername, password);
  try {
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select('+password');

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email/username or password" });
    }
    // console.log(user);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ message: "Invalid email/username or password" });
    }
    // console.log("Reached here");
    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        region: user.region,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, role, region , currentPassword, newPassword } = req.body;
    let updateData = { name, email, role };

    if(role) updateData.role = Array.isArray(role) ? role : [role];


    if(region) updateData.region = Array.isArray(region) ? region : [region];

    if (currentPassword && newPassword) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedNewPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: "-password" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();

    const resetTokenExpiry = new Date();
    resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 30);

    user.resetPasswordToken = resetCode;
    user.resetPasswordExpire = resetTokenExpiry;

    await user.save();

    const emailResponse = await sendMail(
      email,
      "Password Reset Code",
      `Your password reset code is ${resetCode}`
    );

    if (emailResponse.success != true) {
      return res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: emailResponse.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset code sent to your email",
    });
  } catch (error) {
    // console.error("Error in forgotPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message || "Something went wrong",
    });
  }
};

export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.resetCodeVerified = true;
    await user.save();

    const resetToken = jwt.sign(
      {
        email: user.email,
        purpose: "password-reset",
      },
      process.env.RESET_PASSWORD_JWT_SECRET,
      {
        expiresIn: "30m",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Code verified successfully",
      userId: user._id,
      resetToken,
    });
  } catch (error) {
    // console.error("Error in verifyResetCode:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, please try again",
      error: error.message || "Something went wrong",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (!resetToken) {
      return res.status(400).json({
        message: "Session expired , please generate a new reset code",
      });
    }

    const decoded = jwt.verify(
      resetToken,
      process.env.RESET_PASSWORD_JWT_SECRET
    );

    if (!decoded || decoded?.purpose !== "password-reset") {
      return res
        .status(400)
        .json({ message: "Invalid token, please generate a new reset code" });
    }

    const { email } = decoded;

    const user = await User.findOne({
      email,
      resetCodeVerified: true,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token, please generate a new reset code",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetCodeVerified = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    // console.error("Error in resetPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error , generate a new reset code ",
      error: error.message || "Something went wrong",
    });
  }
};
