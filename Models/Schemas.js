const mongoose = require("mongoose");
const { boolean, string } = require("zod");

const AppliedJobSchema = new mongoose.Schema({
  jobId: String,
  status: { type: String },
});

const ApplicationsSchema = new mongoose.Schema({
  candidateId: String,
  candidatename: String,
  appliedJobs: { type: [AppliedJobSchema], default: [] },
  skills: String,
  experience: String,
  education: String,
  resume: String,
});

const JobsDataSchema = new mongoose.Schema({
  id: Number,
  role: String,
  image: String,
  description: String,
  name: String,
  requirements: String,
  isopen: Boolean,
  location: String,
  recruiterid: String,
  salary: String,
});
const UsersSchema = new mongoose.Schema({
  email: String,
  password: String,
  username: String,
  // id: Number,
  role: String,
});

const SavedJobsSchema = new mongoose.Schema({
  candidateId: String,
  savedJobs: [String],
});

const Applications = mongoose.model("applications", ApplicationsSchema);
const Jobs = mongoose.model("jobs", JobsDataSchema);
const Users = mongoose.model("user", UsersSchema);
const SavedJobs = mongoose.model("savedJob", SavedJobsSchema);

module.exports = { Applications, Jobs, Users, SavedJobs };
