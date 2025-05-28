
export class Course {
  id: string; // UUID
  course_code: string;
  course_name: string;
  lecturer_name: string;
  created_at: Date;
  updated_at: Date;
  // You can add relationships here if needed, e.g., schedules: Schedule[];
}

export class Schedule {
    id: string; // UUID
    course_id: string; // Foreign Key
    room_id: string; // Foreign Key
    schedule_start_time: Date;
    schedule_end_time: Date;
    semester: number;
    created_at: Date;
    updated_at: Date;
    course?: Course;
    room?: Room;

}

export class Room {
  id: string; // UUID
  room_code: string;
  room_name: string;
  status: 'aktif' | 'kosong' | 'pemeliharaan';
  capacity: number;
  rating: number;
  facilities?: string[]; // Optional array of strings for facilities
  created_at: Date;
  updated_at: Date;
}