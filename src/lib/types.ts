export type Profile = {id:string;role:"client"|"lawyer"|"company";full_name:string;city:string;state:string;company_name:string;disabled_at:string|null;created_at:string};
export type Lawyer = {user_id:string;display_name:string;bio:string;oab_number:string;oab_state:string;city:string;state:string;areas:string[];experience_years:number;available:boolean;avatar_url:string;verification_status:"pending"|"approved"|"rejected";created_at:string};
export type Contact = {id:string;requester_id:string;lawyer_id:string;subject:string;description:string;status:"pending"|"accepted"|"rejected"|"closed";created_at:string};
export type Conversation = {id:string;request_id:string;requester_id:string;lawyer_id:string;active:boolean;created_at:string};
export type Message = {id:string;conversation_id:string;sender_id:string;body:string;created_at:string};
