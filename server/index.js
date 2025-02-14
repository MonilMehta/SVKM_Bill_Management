import Role from "./models/roles-model.js";
import ComplianceMaster from "./models/compliance-master.js";
import ActionTypeMaster from "./models/action-type-master-model.js";
import User from "./models/user-model.js";
import NatureMaster from "./models/nature-master-model.js";
import BillStatusMaster from "./models/bill-status-master-model.js";
import Region from "./models/regions-model.js";
import UserRole from "./models/user-roles-model.js";
import Vendor from "./models/vendor-model.js";
import Bill from "./models/bill-model.js";
import BillWorkflow from "./models/bill-workflow-model.js";

const createtables = async() => {
    try{
        await Role();
        await ComplianceMaster();
        await ActionTypeMaster();
        await User();
        await NatureMaster();
        await BillStatusMaster();
        await Region();
        await UserRole();
        await Vendor();
        await Bill();
        await BillWorkflow();
    }
    catch(err){
        console.log('Error creating table'+err);
    }
}
createtables();