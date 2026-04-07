// ========== TYPES ==========

export type Campus = 'MAIN' | 'ANNEX' | 'CPAG';
export type UserStatus = string;
export type RequestType = 'Appointment' | 'Event First-Aid' | 'Document' | 'General Inquiry';
export type RequestStatus = 'Pending' | 'Accepted' | 'Completed' | 'Rejected';
export type StockLevel = 'Good' | 'Medium' | 'Low';

export interface SystemUser {
    id: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    student_number?: string;
    section?: string;
    year_level?: string;
    course?: string;
    birthdate?: string;
    gender?: string;
    email?: string;
    region?: string;
    city?: string;
    barangay?: string;
    street_address?: string;
    id_front_url?: string;
    id_back_url?: string;
    ocr_raw_front?: string;
    ocr_raw_back?: string;
    created_at: string;
    updated_at?: string;
    status: UserStatus;

    // UI conveniences (either stored or computed on the frontend)
    fullName: string;
    studentId: string;
    address?: string;
    contact?: string;
    sex?: string;
    age?: number;
    checkupLogs?: CheckupLog[];
    createdAt: string;

    // Health and Contact info
    height_cm?: number;
    weight_kg?: number;
    blood_type?: string;
    allergies?: string[];
    chronic_conditions?: string[];
    current_medications?: string[];
    ispwd?: boolean;
    contact_person?: string;
    contact_number?: string;
}

export interface CheckupLog {
    id: string;
    date: string;
    notes: string;
}

export interface VisitRecord {
    id: string;
    visit_date: string;         // timestamptz
    nurse_assigned: string;     // text
    vital_signs: any;           // jsonb
    treatment_given: string[];  // text array
    diagnosis: string[];        // text array
    diagnostic_results: string[]; // text array
    follow_up: string;          // text
    visit_patient: string;      // uuid (FK to profiles.id)
    created_at?: string;
}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    notification_type: string;
    target_type: string;
    target_criteria?: any;
    user_id?: string;
    target_id?: string;
    created_at: string;
}


export interface Officer {
    id: string;
    userId: string;
    fullName: string;
    studentId: string;
    campus: string;
    clinic: string;
    dutyStart: string; // "HH:mm"
    dutyEnd: string;   // "HH:mm"
    permissions: string[];
    assignedAt?: string;
    password?: string;
}

export interface CampusRecord {
    id: string;
    name: string;
    location: string;
    contact: string;
    active: boolean;
    description?: string;
    createdAt: string;
}

export interface InventoryItem {
    id: string;
    item_name: string;
    asset_type: string;
    status: string;
    quantity: number;
    expiry_date: string | null;
    created_at: string;
    updated_at: string;
    unit_measure: string;
    campus: string;
}

export interface Request {
    id: string;
    type: RequestType;
    requesterName: string;
    requesterStudentId?: string;
    campus: Campus;
    date: string;
    status: RequestStatus;
    details: string;
}

export interface MedicalCertRequest {
    id: string;
    requester_id: string;
    requested_tst: string;
    status: string;
    contact_number: string;
    request_reason: string;
    uploaded_id_img: string;
    // UI convenience
    requester_name?: string; 
    requester_student_number?: string;
    profiles?: SystemUser;
    campus?: string;
    admin_created?: boolean;
}

export interface MedicineRequest {
    id: string;
    requester_id: string;
    requested_tst: string;
    status: string;
    contact_number: string;
    request_reason: string;
    medicine: string;
    medicine_qty: number;
    campus: string;
    // UI convenience
    requester_name?: string;
    requester_student_number?: string;
    profiles?: SystemUser;
    admin_created?: boolean;
}

export interface Appointment {
    id: string;
    requester_id: string;
    contact_number: string;
    visit_reason: string;
    request_timestamp: string;
    status: string;
    category: string;
    // UI convenience
    requester_name?: string;
    requester_student_number?: string;
}

export interface AcceptedAppointment {
    id: string;
    requester_id: string;
    appointment_id: string;
    nurse_assigned: string;
    appointment_sched: string;
    campus: string;
    category: string;
    // UI convenience
    requester_name?: string;
    requester_student_number?: string;
    contact_number?: string;
    visit_reason?: string;
}

export interface SystemLog {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
}

export interface Inquiry {
    id: string;
    inquirer_id: string;
    subject: string;
    inquiry: string;
    inquiry_timestamp: string;
    completed_timestamp?: string;
    // UI convenience
    inquirer_name?: string;
    inquirer_student_number?: string;
    inquirer_email?: string;
}

export interface HealthAdvisory {
    id: string;
    title: string;
    summary: string;
    category: string;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    healthConcerns: string[];
    preventiveActions: string[];
    whenToSeekHelp: string[];
    sourceUrl: string;
    publishedAt: string;
    oneSentenceSummary?: string;
    fullContent?: string;
}

export interface Clinic {
    id: string;
    campusId?: string; // Optional: Links to a CampusRecord if applicable
    name: string;
    location: string;
    contact: string;
    active: boolean;
    createdAt: string;
}


export interface AppState {
    users: SystemUser[];
    officers: Officer[];
    campuses: CampusRecord[];
    clinics: Clinic[];
    inventory: InventoryItem[];
    requests: Request[];
    medicalCertRequests: MedicalCertRequest[];
    medicineRequests: MedicineRequest[];
    logs: SystemLog[];
    visitRecords: VisitRecord[];
    appointments: Appointment[];
    acceptedAppointments: AcceptedAppointment[];
    advisories: HealthAdvisory[];
    inquiries: Inquiry[];
    notifications: AppNotification[];
    readNotificationIds: string[];
}
