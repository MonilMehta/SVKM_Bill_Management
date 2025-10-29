import mongoose from "mongoose";
import VendorMaster from "../models/vendor-master-model.js";
import {connectDB} from "./db.js"; // Adjust the path as necessary

// Vendor data from your table
const vendorDetails = [
  {
      'Vendor no': '500939',
      'Vendor Name': 'Signature Interior Pvt Ltd',
      'GST Number': '27AAMCS7523B1ZC',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502272',
      'Vendor Name': 'Varun Enterprises',
      'GST Number': '23ADVPD2390Q1ZZ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502074',
      'Vendor Name': 'M V Patel And Company',
      'GST Number': '23AAUFM9577E1ZO',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502251',
      'Vendor Name': 'Vittoria Designs Pvt Ltd',
      'GST Number': '24AAECV7221K1Z9',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502256',
      'Vendor Name': 'Arihant Alu Glass Systom Pvt Ltd',
      'GST Number': '23AAFCA4192B1Z6',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502526',
      'Vendor Name': 'J K Corporation',
      'GST Number': '24AVPPS2852L1ZY',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503392',
      'Vendor Name': 'G K Enterprises',
      'GST Number': '27CBEPK6271L1Z9',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '100012',
      'Vendor Name': 'Satguru Enterprise',
      'GST Number': '27ADXPS7279M1Z4',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502984',
      'Vendor Name': 'PRATHAM INTERIORS',
      'GST Number': '36AAHPK4359D1ZR',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503277',
      'Vendor Name': 'Aimco Stones',
      'GST Number': '22APTPA3304F1ZG',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502344',
      'Vendor Name': 'FORMTECH INFRA PVT LTD',
      'GST Number': '27AADCF0622K1ZT',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503678',
      'Vendor Name': 'RAGHAVENDRA ELECTRICAL ENGINEERS',
      'GST Number': '27AKWPK4307J1ZP',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503656',
      'Vendor Name': 'SRI ASHOKA MARKETING SERVICES',
      'GST Number': '36ABFPB5910L1ZS',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503072',
      'Vendor Name': 'Premiere Electrical Solutions LLP',
      'GST Number': '27AAUFP2296B1ZX',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503633',
      'Vendor Name': 'KRISHNA TRADELINKS',
      'GST Number': '27AANFK3748A1ZC',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504060',
      'Vendor Name': 'Shirish Sadanand Malvankar',
      'GST Number': '',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504053',
      'Vendor Name': 'SIMI BHATIA',
      'GST Number': '',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500144',
      'Vendor Name': 'Zubair Water Proofing Co',
      'GST Number': '27AAAPQ0984F1ZO',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503164',
      'Vendor Name': 'SARA TIMBER ASSOCIATES',
      'GST Number': '27CIIPS2002Q1ZV',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503438',
      'Vendor Name': 'THE INDIAN PLYWOOD MANUFACTURING CO. P.',
      'GST Number': '27AAACT2444C1ZR',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '112778',
      'Vendor Name': 'PAMBALA MALLESHAM',
      'GST Number': '27DHOPP9352L1ZD',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '113331',
      'Vendor Name': 'MEGATECH SOLUTIONS',
      'GST Number': '27ACAFM1933A1ZS',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502250',
      'Vendor Name': 'Khushi Distributors',
      'GST Number': '27AAAPB8189M1ZB',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503017',
      'Vendor Name': 'MGB MOTOR AND AUTO AGENCIES\nPRIVATE LIMITED',        
      'GST Number': '36AACCM3689E1ZC',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503285',
      'Vendor Name': 'G.M. INTERIORS',
      'GST Number': '27AFPPV9477E1ZI',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '108850',
      'Vendor Name': 'HOSMAC INDIA PRIVATE LIMITED',
      'GST Number': '27AAACH5463R1ZZ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504185',
      'Vendor Name': 'M/S. M.C.C. ASSOCIATES',
      'GST Number': '21AHYPB6787G1ZY',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503381',
      'Vendor Name': 'ALPHA CONSTRUCTION',
      'GST Number': '27ACSPL4330N1Z2',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '509029',
      'Vendor Name': 'MAKWANA ASSOCIATES',
      'GST Number': ' 27ABLFM4935A1ZB',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500592',
      'Vendor Name': 'Microline India Pvt ltd',
      'GST Number': '27AABCM2689R1ZN',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '101734',
      'Vendor Name': 'Shree Ram Mega Structure Pvt Ltd',
      'GST Number': '27AAMCS8841E1ZZ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500670',
      'Vendor Name': 'SAMA ARTS',
      'GST Number': '27AINPJ0186H1Z3',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '501916',
      'Vendor Name': 'SAIF GLAZIERS-GST Issue',
      'GST Number': '27ABOFS5413J1ZS',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500137',
      'Vendor Name': 'Trikaya Gypsum-GST Issue',
      'GST Number': '27AAAAT8974H1ZY',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '109019',
      'Vendor Name': 'Lustre Glass',
      'GST Number': '27AAHFL6302K1Z8',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503276',
      'Vendor Name': 'MAHARASHTRA ALUMINIUM CENTRE',
      'GST Number': '27AAGFM1188H1Z5',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502368',
      'Vendor Name': 'SNB Infrastructure Pvt Ltd',
      'GST Number': '27AAMCS0182N1ZU',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500520',
      'Vendor Name': 'Powerica Limited',
      'GST Number': '29AAACP3812E1ZP',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504131',
      'Vendor Name': 'VIBRANT DESIGNS PRIVATE LIMITED',
      'GST Number': '24AADCV4086F1ZC',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503195',
      'Vendor Name': 'Mehta Design Associates    (MeDesA)',
      'GST Number': '27AGHPM7279A1Z9',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502054',
      'Vendor Name': 'Simero Vitrified Pvt Ltd',
      'GST Number': '24AAUCS7284B1Z0',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502326',
      'Vendor Name': 'DORMAKABA INDIA PRIVATE LIMITED',
      'GST Number': '33AAACD3980D1Z1',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503241',
      'Vendor Name': 'TRINITY HEALTHTECH (A DIV OF THTPL)',
      'GST Number': '27AABCT8177B1ZA',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502659',
      'Vendor Name': 'GREENLAM INDUSTRIES LIMITED',
      'GST Number': '23AAFCG2966D1ZU',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '100097',
      'Vendor Name': 'Microware Communications',
      'GST Number': '27AAAFM1504B1Z3',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504025',
      'Vendor Name': 'SWASTIK GLASS INDUSTRIES',
      'GST Number': '24ACFFS2276M1ZS',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502134',
      'Vendor Name': 'KEEC (I) Private Limited',
      'GST Number': '27AACCK4214F1ZW',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503663',
      'Vendor Name': 'VENKATESHWARA IRRIGATION SERVICE',
      'GST Number': '36AMRPB9455F1ZQ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '112516',
      'Vendor Name': 'BOMBAY INTEGRATED SECURITY (INDIA) LIMIT',
      'GST Number': '24AABCB5803G1Z5',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504134',
      'Vendor Name': 'NORTHCONS REALTORS LLP',
      'GST Number': '27AAQFN2949H1ZR',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502982',
      'Vendor Name': 'S.B.INTERIOR',
      'GST Number': '27AAMHS3130B1ZF',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '110239',
      'Vendor Name': 'APEX INTERIOR & FAÇADE',
      'GST Number': '27AELPV3628J1ZW',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '111238',
      'Vendor Name': 'TRANSLOT LOGISTICS',
      'GST Number': '',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '101970',
      'Vendor Name': 'Ravi Traders',
      'GST Number': '27BCEPS7240B1ZQ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503289',
      'Vendor Name': 'EXPERT KARIGHAR',
      'GST Number': '08FVUPS8037K1ZF',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503122',
      'Vendor Name': 'AYAANA CONSTRUCTION AND DEVELOPERS',
      'GST Number': '23AKNPC1619G1ZK',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500374',
      'Vendor Name': 'Kombination',
      'GST Number': '24AACFK0063B1Z5',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500152',
      'Vendor Name': 'Pravin Gala Consultants Pvt. Ltd',
      'GST Number': '27AAFCP0682F1ZG',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504024',
      'Vendor Name': 'B PLUS AC PRIVATE LIMITED',
      'GST Number': '27AAJCB6624M1Z9',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '504039',
      'Vendor Name': 'BASANT BETONS',
      'GST Number': '29AABFB0756F1ZP',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '113150',
      'Vendor Name': 'AQUA CARE SOLUTIONS',
      'GST Number': '29CYDPM3415Q2ZU',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503787',
      'Vendor Name': 'NARAYAN BUILDCON',
      'GST Number': '27AAQFN5892H1ZJ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503807',
      'Vendor Name': 'JANSHA SOLUTIONS',
      'GST Number': '27BUZPP7541M1ZG',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '501689',
      'Vendor Name': 'HARISH CHANDRU',
      'GST Number': '29AIRPC6788L1Z9',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '111679',
      'Vendor Name': 'Sachin Enterprises',
      'GST Number': '23AMAPJ0800B1Z7',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502672',
      'Vendor Name': 'Ego Wall Decor Pvt Ltd',
      'GST Number': '27AABCE9504B1Z0',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503422',
      'Vendor Name': 'MOHINI WIRES & CABLES',
      'GST Number': '23ACAPM7667D1ZQ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503883',
      'Vendor Name': 'SATISH ENTERPRISES PVT. LTD.',
      'GST Number': '27AARCS0739A1ZD',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '109157',
      'Vendor Name': 'Bhairav Enterprises',
      'GST Number': '27AAUFB9873A1Z0',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503959',
      'Vendor Name': 'R N INDUSTRIAL ELECTRICALS PVT LTD',
      'GST Number': '27AAECR0238A1ZX',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502870',
      'Vendor Name': 'Eagle Techsec Communications India Pvt Ltd',
      'GST Number': '23AACCE4785D1ZU',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '501618',
      'Vendor Name': 'Surendra Interior-GST Issue',
      'GST Number': '27ABJPY5315N1ZX',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '109730',
      'Vendor Name': 'VARUN ENTERPRISES',
      'GST Number': '36ADVPD2390Q1ZS',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503936',
      'Vendor Name': 'SIDDHARTH  ALUMINIUM',
      'GST Number': '27AIIPB9601Q1ZV',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502446',
      'Vendor Name': 'Tameer Consulting Associates',
      'GST Number': '36AIRPS8554J1ZA',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '111803',
      'Vendor Name': 'D C ENTERPRISE',
      'GST Number': '27AAMFD7336E1ZC',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502428',
      'Vendor Name': 'PAGARIYA HOMES',
      'GST Number': '27AAVFP6927G1ZK',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502223',
      'Vendor Name': 'Zion Lights',
      'GST Number': '27AQUPS8655F2ZW',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503428',
      'Vendor Name': 'GLEEDS CONSULTING (INDIA) PRIVATE LIMITED',
      'GST Number': '29AABCH6072K1Z9',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503779',
      'Vendor Name': 'KRISHNA ENTERPRISES',
      'GST Number': '27AQDPT1867D2ZO',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '104379',
      'Vendor Name': 'Godrej & Boyce Mfg Co Ltd',
      'GST Number': '27AAACG1395D1ZU',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '109327',
      'Vendor Name': 'Sai Ganesh Enterprise',
      'GST Number': '',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '501806',
      'Vendor Name': 'Beyond Green',
      'GST Number': '24AAOFB7369M1ZS',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502914',
      'Vendor Name': 'LMK & ASSOCIATES',
      'GST Number': '27AAIFL0174E1ZI',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '500215',
      'Vendor Name': 'Amoda Parisar Telbiya Utpadak Sahakari Sanstha Ltd.', 
      'GST Number': '27AAATA3309C1ZD',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '502297',
      'Vendor Name': 'NK ELECTRICAL AGENCIES PVT LTD',
      'GST Number': '27AACCN2488C1ZJ',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '110798',
      'Vendor Name': 'PSP Projects Limited',
      'GST Number': '24AAECP7961L1ZY',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
    {
      'Vendor no': '503448',
      'Vendor Name': 'SPORTS FACILITIES CO PVT LTD',
      'GST Number': '27AALCS9132M1ZP',
      '206AB Compliance': '2024-Non-Specified person U/S 206AB',
      'PAN Status': 'PAN operative/N.A.'
    },
]

// Get unique vendor names with valid GSTNumber
const uniqueVendorsMap = new Map();
vendorDetails.forEach(v => {
  if (v["GST Number"] && v["GST Number"].trim() !== "") {
    uniqueVendorsMap.set(v["Vendor Name"], v);
  }
});
const vendors = Array.from(uniqueVendorsMap.values()).map(v => ({
  vendorNo: v["Vendor no"],
  vendorName: v["Vendor Name"],
  PAN: "ABLFM4935A",
  GSTNumber: v["GST Number"],
  complianceStatus: v["206AB Compliance"] || "",
  PANStatus: v["PAN Status"] || "",
  emailIds: "medha.rajwade@svkm.ac.in;mamta.masurkr@svkm.ac.in",
  phoneNumbers: "12345678, 456423400"
}));

async function seedVendors() {
  try {
    await connectDB(); // Ensure you have a function to connect to your DB
    await VendorMaster.deleteMany({});
    await VendorMaster.insertMany(vendors);
    // console.log("Vendors added successfully.");
  } catch (err) {
    // console.error("Error adding vendors:", err);
  } finally {
    await mongoose.connection.close();
  }
}

seedVendors();