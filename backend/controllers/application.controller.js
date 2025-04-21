import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { spawn } from 'child_process';

export const applyJob = async(req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;
        if (!jobId) {
            return res.status(400).json({
                message: "Job id is required.",
                success: false
            })
        };
        // check if the user has already applied for the job
        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });

        if (existingApplication) {
            return res.status(400).json({
                message: "You have already applied for this jobs",
                success: false
            });
        }

        // check if the jobs exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            })
        }

        // Check if user has resume and skills in their profile
        const user = await User.findById(userId);

        if (!user.profile.resume || !user.profile.skills || user.profile.skills.length === 0) {
            return res.status(400).json({
                message: "Please complete your profile with resume and skills before applying",
                success: false
            });
        }


        // check compatbility of resume with job skills

        // get the skills of the job 

        const jobSkills = job.skills;
        console.log('Job skills:', jobSkills);

        if (jobSkills.length === 0) {
            console.log('No job skills found for job ID:', jobId);
            return res.status(400).json({ message: 'No skills provided', success: false });
        }

        console.log('User resume path:', user.profile.resume);
        console.log('Spawning Python process with skills:', jobSkills.join(','));

        const pythonProcess = spawn('python', [
            'controllers/resume_matcher.py',
            user.profile.resume,
            jobSkills.join(',')
        ]);

        console.log('Python process spawned');

        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            const dataStr = data.toString();
            console.log('Python stdout:', dataStr);
            result += dataStr;
        });

        pythonProcess.stderr.on('data', (data) => {
            const dataStr = data.toString();
            console.log('Python stderr:', dataStr);
            error += dataStr;
        });

        pythonProcess.on('close', async(code) => {
            console.log('Python process exited with code:', code);
            if (code !== 0 || error) {
                console.error('Python script failed with error:', error);
                return res.status(201).json({
                    message: "Job applied successfully, but couldn't analyze resume compatibility.",
                    success: true
                });
            }

            try {
                console.log('Raw result from Python:', result);
                const parsedResult = JSON.parse(result);
                console.log('Parsed result:', parsedResult);

                // Create application with match percentage
                const newApplication = await Application.create({
                    job: jobId,
                    applicant: userId,
                    matchPercentage: parsedResult.matchPercentage || 0
                });

                job.applications.push(newApplication._id);
                await job.save();

                return res.status(201).json({
                    message: "Job applied successfully.",
                    matchPercentage: parsedResult.matchPercentage || 0,
                    success: true
                });
            } catch (e) {
                console.error('Failed to parse Python result:', e);

                // Create application even if parsing fails
                const newApplication = await Application.create({
                    job: jobId,
                    applicant: userId,
                });

                job.applications.push(newApplication._id);
                await job.save();

                return res.status(201).json({
                    message: "Job applied successfully, but couldn't analyze resume compatibility.",
                    success: true
                });
            }
        });



    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};
export const getAppliedJobs = async(req, res) => {
    try {
        const userId = req.id;
        const application = await Application.find({ applicant: userId }).sort({ createdAt: -1 }).populate({
            path: 'job',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'company',
                options: { sort: { createdAt: -1 } },
            }
        });
        if (!application) {
            return res.status(404).json({
                message: "No Applications",
                success: false
            })
        };
        return res.status(200).json({
            application,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}

export const getApplicants = async(req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path: 'applications',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'applicant',
                populate: {
                    path: 'profile'
                }
            }
        });
        if (!job) {
            return res.status(404).json({
                message: 'Job not found.',
                success: false
            })
        };

        // Calculate skills match percentage for each applicant
        // const jobWithMatchPercentage = {
        //     ...job.toObject(),
        //     applications: job.applications.map(application => {
        //         const applicantSkills = application.applicant?.profile?.skills || [];
        //         const jobSkills = job.skills || [];

        //         let matchPercentage = 0;

        //         if (jobSkills.length > 0 && applicantSkills.length > 0) {
        //             const matchedSkills = applicantSkills.filter(skill =>
        //                 jobSkills.includes(skill)
        //             );
        //             matchPercentage = (matchedSkills.length / jobSkills.length) * 100;
        //         }

        //         return {
        //             ...application.toObject(),
        //             skillsMatchPercentage: parseFloat(matchPercentage.toFixed(2))
        //         };
        //     })
        // };

        return res.status(200).json({
            job: job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const updateStatus = async(req, res) => {
    try {
        const { status } = req.body;
        const applicationId = req.params.id;
        if (!status) {
            return res.status(400).json({
                message: 'status is required',
                success: false
            })
        };

        // find the application by applicantion id
        const application = await Application.findOne({ _id: applicationId });
        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
                success: false
            })
        };

        // update the status
        application.status = status.toLowerCase();
        await application.save();

        return res.status(200).json({
            message: "Status updated successfully.",
            success: true
        });

    } catch (error) {
        console.log(error);
    }
}