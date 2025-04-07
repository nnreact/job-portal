import React, { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Loader2, X, FileText } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

const UpdateProfileDialog = ({ open, setOpen }) => {
    const [loading, setLoading] = useState(false);
    const { user } = useSelector(store => store.auth);

    const [input, setInput] = useState({
        fullname: user?.fullname || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        bio: user?.profile?.bio || "",
        skills: user?.profile?.skills?.join(", ") || "",
        file: user?.profile?.resume || ""
    });
    const [skillTags, setSkillTags] = useState(user?.profile?.skills || []);
    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    }

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        setInput({ ...input, file })
    }

    const handleSkillInput = (e) => {
        setInput({ ...input, skills: e.target.value });
    }

    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const skill = input.skills.trim();
            if (skill && !skillTags.includes(skill)) {
                const newSkillTags = [...skillTags, skill];
                setSkillTags(newSkillTags);
                setInput({ ...input, skills: "" });
            }
        }
    }

    const removeSkill = (skillToRemove) => {
        const newSkillTags = skillTags.filter(skill => skill !== skillToRemove);
        setSkillTags(newSkillTags);
    }

    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("fullname", input.fullname);
        formData.append("email", input.email);
        formData.append("phoneNumber", input.phoneNumber);
        formData.append("bio", input.bio);
        
        // Join all skills for backend submission
        const skillsToSubmit = skillTags.length > 0 ? skillTags.join(",") : input.skills;
        formData.append("skills", skillsToSubmit);
        
        if (input.file && typeof input.file !== 'string') {
            formData.append("file", input.file);
        }
        try {
            setLoading(true);
            const res = await axios.post(`${USER_API_END_POINT}/profile/update`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.message);
        } finally{
            setLoading(false);
        }
        setOpen(false);
    }



    return (
        <div>
            <Dialog open={open}>
                <DialogContent className="sm:max-w-[425px]" onInteractOutside={() => setOpen(false)}>
                    <DialogHeader>
                        <DialogTitle>Update Profile</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitHandler}>
                        <div className='grid gap-4 py-4'>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    name="fullname"
                                    type="text"
                                    value={input.fullname}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={input.email}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="phoneNumber" className="text-right">Number</Label>
                                <Input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={input.phoneNumber}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="bio" className="text-right">Bio</Label>
                                <Input
                                    id="bio"
                                    name="bio"
                                    value={input.bio}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-start gap-4'>
                                <Label htmlFor="skills" className="text-right pt-2">Skills</Label>
                                <div className="col-span-3">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {skillTags.map((skill, index) => (
                                            <div key={index} className="bg-slate-100 px-2 py-1 rounded-md flex items-center text-sm">
                                                {skill}
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeSkill(skill)}
                                                    className="ml-1 text-slate-500 hover:text-slate-700"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <Input
                                        id="skills"
                                        name="skills"
                                        value={input.skills}
                                        onChange={handleSkillInput}
                                        onKeyDown={handleSkillKeyDown}
                                        placeholder="Type skill and press Enter or comma"
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Press Enter or comma to add a skill
                                    </p>
                                </div>
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="file" className="text-right">Resume</Label>
                                <div className="col-span-3">
                                    {typeof input.file === 'string' && input.file && (
                                        <div className="flex items-center mb-2 text-sm text-blue-600">
                                            <FileText size={16} className="mr-1" />
                                            <a href={input.file} target="_blank" rel="noopener noreferrer" className="underline">
                                                Current Resume
                                            </a>
                                        </div>
                                    )}
                                    <Input
                                        id="file"
                                        name="file"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={fileChangeHandler}
                                        className="col-span-3"
                                    />
                                    {typeof input.file === 'string' && input.file && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Upload a new file to replace the current resume
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            {
                                loading ? <Button className="w-full my-4"> <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Please wait </Button> : <Button type="submit" className="w-full my-4">Update</Button>
                            }
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default UpdateProfileDialog