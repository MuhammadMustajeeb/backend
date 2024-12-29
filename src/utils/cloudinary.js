import {v2 as cloudinary} from 'cloudinary'
import fs from "fs"

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const uploadOnCloudinary = async (localFilePath) => {
        try{
            if (!localFilePath) return null;
            //upload file on cloudinary
            const response = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto"
            })
            //if file has been uploaded
            //console.log('file is uploaded on cloudinary', response.url);
            fs.unlinkSync(localFilePath)
            return response;
        } catch(err) {
            fs.unlinkSync(localFilePath) //remove the locally saved temporarily file as the upload got failed
            return null;
        }
    }
    
    export default uploadOnCloudinary