const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const multer = require("multer");
const path = require("path");
const env = require("dotenv");
const mongoose = require("mongoose");
const secret_key = "login_System";
const salt = 10;
const { Jobs, Users, SavedJobs, Applications } = require("./Models/Schemas");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const allowedOrigins = [
  "http://localhost:5173",
  "https://job-hunter-git-master-rakeshs-projects-838f71b0.vercel.app/",
];
env.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(
  cors({
    origin: allowedOrigins, // Allow requests only from this origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // Allow these HTTP methods
    credentials: true, // Allow cookies and credentials to be sent
  })
);
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

console.log(process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI)
  .then((sucess) => console.log("connected"))
  .catch((failed) => console.log("failed connection"));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const Port = process.env.PORT || 3000;

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "resumes", // Folder name in Cloudinary
    format: async (req, file) => "pdf", // Convert all files to PDF
    resource_type: "raw",
    public_id: (req, file) => `resume_${Date.now()}`,
    access_mode: "public",
  },
});

const upload = multer({ storage });

app.post("/job-application", upload.single("resume"), async (req, res) => {
  try {
    const {
      skills,
      experience,
      education,
      candidateId,
      candidatename,
      appliedJobId,
      status,
    } = req.body;

    const resumeUrl = req.file ? req.file.path : null;
    console.log(resumeUrl);
    // Find the candidate by ID
    let candidate = await Applications.findOne({ candidateId });

    if (!candidate) {
      // Create new candidate if not exists
      candidate = new Applications({
        candidateId,
        candidatename,
        skills,
        experience,
        education,
        resume: resumeUrl, // Store Cloudinary URL
        appliedJobs: [{ jobId: appliedJobId, status: "" }],
      });
    } else {
      // Check if the candidate has already applied for this job
      const existingJob = candidate.appliedJobs.find(
        (job) => job.jobId === appliedJobId
      );

      if (existingJob) {
        existingJob.status = status;
      } else {
        candidate.appliedJobs.push({ jobId: appliedJobId, status: "" });
      }

      // Update resume if a new one is uploaded
      if (resumeUrl) {
        candidate.resume = resumeUrl;
      }
    }

    // Save candidate to MongoDB
    await candidate.save();

    res.status(200).json({ message: "Application submitted successfully" });
  } catch (error) {
    console.error("Error saving application:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/", (req, res) => {
  res.send("hello");
});

app.get("/joblist", async (req, res) => {
  const jobsData = await Jobs.find();
  // console.log(jobsData);
  res.json(jobsData);
});

app.get("/register", async (req, res) => {
  const jobsData = await Users.find();
  res.json(jobsData);
});

app.get("/users", async (req, res) => {
  const users = await Users.find();
  res.json(users);
});

app.get("/save-job", async (rwq, res) => {
  const data = await SavedJobs.find();
  res.send(data);
});

app.get("/job-application", async (req, res) => {
  const data = await Applications.find();
  res.send(data);
});

app.get("/jobs/:id", async (req, res) => {
  const jobId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return res.status(400).json({ message: "Invalid Job ID format" });
  }

  try {
    const job = await Jobs.findById(jobId);
    if (job) {
      res.json(job);
    } else {
      res.status(404).json({ message: "Job not found" });
    }
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/jobs/:id/apply", (req, res) => {
  const { skills, experience, education, upload } = req.body;
  const id = req.params.id;
  // console.log(skills);
  const data = readData(datafile);
  const job = data.find((user) => id == user.id);
  const appliedData = readData(applicationsData);
  console.log(appliedData[appliedData.length - 1]);

  res.send("yes");
});

// function authMiddleware(req, res, next) {
//   const token = req.headers["authorization"]?.split(" ")[1];
//   if (!token) {
//     return res.status(401).json({ message: "No token provided" });
//   }
//   jwt.verify(token, secret_key, (err, decoded) => {
//     if (err) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }
//     req.user = decoded;
//     next();
//   });
// }

// app.use(authMiddleware);

app.post("/", async (req, res) => {
  try {
    // console.log(req.body);
    const data = new Users(req.body);
    await data.save();
    res.status(201).send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error saving data", error });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new Users({
      email,
      username,
      password: hashedPassword,
    });

    // Save user to DB
    await newUser.save();

    res
      .status(201)
      .json({ message: "User created successfully", data: newUser });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    // Find user by email
    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token (exclude sensitive fields)
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      secret_key,
      { expiresIn: "3h" }
    );

    res.status(200).json({
      message: `Welcome ${user.username}`,
      token,
      status: 200,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/postjob", async (req, res) => {
  try {
    const {
      name,
      image,
      description,
      role,
      requirements,
      isopen,
      location,
      recruiterid,
      salary,
    } = req.body;

    if (!name || !description || !role || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create new job document
    const newJob = new Jobs({
      name,
      image,
      description,
      role,
      requirements,
      isopen,
      location,
      recruiterid,
      salary,
    });

    // Save to database
    await newJob.save();

    res.status(201).json({ message: "Job posted successfully", data: newJob });
  } catch (error) {
    console.error("Error posting job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT - Update a job listing (optional)

// app.put("/jobs/:id",async (req, res) => {
//   const { id } = req.params;
//   const { name, image, description, role, requirements, isOpen, location } =
//     req.body;

//   const jobsData = await Jobs.findOne({_id});
//   const jobIndex = jobsData.findIndex((job) => job.id === parseInt(id));

//   if (jobIndex === -1) {
//     return res.status(404).json({ message: "Job not found" });
//   }

//   const updatedJob = {
//     ...jobsData[jobIndex],
//     name,
//     image,
//     description,
//     role,
//     requirements,
//     isOpen,
//     location,
//   };

//   jobsData[jobIndex] = updatedJob;
//   WriteData(datafile, jobsData);

//   res
//     .status(200)
//     .json({ message: "Job updated successfully", data: updatedJob });
// });

app.put("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, description, role, requirements, isopen, location } =
      req.body;

    // Find job by ID
    const job = await Jobs.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Update job in the database
    const updatedJob = await Jobs.findByIdAndUpdate(
      id,
      { name, image, description, role, requirements, isopen, location },
      { new: true } // Returns the updated job
    );

    res
      .status(200)
      .json({ message: "Job updated successfully", data: updatedJob });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/updateRole", (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: "Email and role are required." });
  }

  const users = readData(usersfile);
  const user = users.find((user) => user.email === email);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  if (user.role) {
    return res
      .status(400)
      .json({ error: "User already has a role. Role cannot be changed." });
  }
  user.role = role;
  WriteData(usersfile, users);

  return res.status(200).json({ message: "Role updated successfully." });
});

// 4. **Save a Job**

// app.post("/save-job", (req, res) => {
//   const { candidateId, jobId } = req.body;

//   if (!candidateId || !jobId) {
//     return res
//       .status(400)
//       .json({ message: "Candidate ID and Job ID are required" });
//   }
//   // Read the saved jobs data
//   const savedJobs = readData(savedJobsData);

//   // Find the candidate's saved jobs entry
//   const candidateSavedJobs = savedJobs.find(
//     (savedJob) => savedJob.candidateId === candidateId
//   );

//   // If the candidate doesn't have any saved jobs, create a new entry
//   if (!candidateSavedJobs) {
//     savedJobs.push({
//       candidateId,
//       savedJobs: [jobId], // Save the job if it's the first time
//     });
//   } else {
//     // If the candidate already has saved jobs
//     const jobIndex = candidateSavedJobs.savedJobs.indexOf(jobId);

//     if (jobIndex === -1) {
//       // If the job is not already saved, save it
//       candidateSavedJobs.savedJobs.push(jobId);
//       res.status(200).json({ message: "Job saved successfully" });
//     } else {
//       // If the job is already saved, unsave it (remove it from the array)
//       candidateSavedJobs.savedJobs.splice(jobIndex, 1);
//       res.status(200).json({ message: "Job unsaved successfully" });
//     }
//   }

//   // Write the updated saved jobs data back to the file
//   WriteData(savedJobsData, savedJobs);
// });
// Update path as needed

app.post("/save-job", async (req, res) => {
  const { candidateId, jobId } = req.body;

  if (!candidateId || !jobId) {
    return res
      .status(400)
      .json({ message: "Candidate ID and Job ID are required" });
  }

  try {
    let candidateSaved = await SavedJobs.findOne({ candidateId });

    let message = "";

    if (!candidateSaved) {
      // First-time save
      candidateSaved = new SavedJobs({
        candidateId,
        savedJobs: [jobId],
      });
      await candidateSaved.save();
      message = "Job saved successfully";
    } else {
      const index = candidateSaved.savedJobs.indexOf(jobId);

      if (index === -1) {
        // Save job
        candidateSaved.savedJobs.push(jobId);
        message = "Job saved successfully";
      } else {
        // Unsave job
        candidateSaved.savedJobs.splice(index, 1);
        message = "Job unsaved successfully";
      }

      await candidateSaved.save();
    }

    res.status(200).json({ message });
  } catch (error) {
    console.error("Error saving job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// // 7. **Update Application Status (For Recruiters)**

app.patch("/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isopen } = req.body;

    // Convert isopen to boolean
    const updatedJob = await Jobs.findByIdAndUpdate(
      id,
      { isopen: Boolean(isopen) },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({
      message: `Job status updated to ${isopen ? "open" : "closed"}`,
      data: updatedJob,
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the job in MongoDB
    const deletedJob = await Jobs.findByIdAndDelete(id);

    if (!deletedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/:candidateId/:jobId", async (req, res) => {
  const { candidateId, jobId } = req.params;
  const { status } = req.body;

  if (
    !status ||
    !["applied", "interviewing", "selected", "rejected"].includes(status)
  ) {
    return res.status(400).json({ message: "Valid status is required" });
  }

  try {
    const result = await Applications.updateOne(
      {
        candidateId: candidateId,
        "appliedJobs.jobId": jobId,
      },
      {
        $set: { "appliedJobs.$.status": status },
      }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "Candidate or job not found in application" });
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(Port, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${Port}`);
});

// app.listen(Port, () => {
//   console.log(`Server is running on http://localhost:${Port}`);
// });
