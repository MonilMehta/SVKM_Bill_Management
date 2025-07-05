import Bill from '../models/bill-model.js';
import { s3Upload } from "../utils/s3.js";

export const updateBillAttachments = async (req, res) => {
    try{
        const {id} = req.params;

        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found"
            });
        }

        if(!req.files || req.files.length === 0){
            return res.status(400).json({
                success: false,
                message: "No files provided"
            });
        }

        const uploadPromises = req.files.map(file => s3Upload(file));
        const uploadResults = await Promise.all(uploadPromises);

        const newAttachments = uploadResults.map(result => ({
            fileName: result.fileName,
            fileKey: result.fileKey,
            fileUrl: result.url  
        }));

        bill.attachments = [...(bill.attachments || []), ...newAttachments];
        await bill.save();

        res.status(200).json({
            success: true,
            message: "Attachments updated successfully",
            data: {
                attachments: bill.attachments
            }
        });

    }catch(e){
        res.status(500).json({
            success: false,
            message: "Failed to update bill attachments",
            error: e.message
        });
    }
};

export const deleteBillAttachment = async (req, res) => {
    try{
        const{id,fileKey} = req.params;

        const bill = await Bill.findById(id);
        if(!bill){
            return res.status(404).json({
                success: false,
                message: "Bill not found"
            });
        }

        const attachmentIndex = bill.attachments.findIndex(
            attachment => attachment.fileKey === fileKey
        );

        if(attachmentIndex === -1){
            return res.status(404).json({
                success: false,
                message: "Attachment not found"
            });
        }

        bill.attachments.splice(attachmentIndex, 1);
        await bill.save();

        res.status(200).json({
            success: true,
            message: "Attachment deleted successfully"
        });

    }catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to delete bill attachment",
            error: e.message
        });
    }
};

export const getBillAttachments = async (req,res) =>{
    try{
        const {id} = req.params;
        const bill = await Bill.findById(id).select('attachments');
        if(!bill){
            return res.status(404).json({
                success:false,
                message:"Bill not found"
            });
        }

        res.status(200).json({
            success: true,
            data:{
                attachments: bill.attachments || []
            }
        });
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to get bill attachments",
            error: error.message
        });
    }
};

export default {
    updateBillAttachments,
    deleteBillAttachment,
    getBillAttachments
};
