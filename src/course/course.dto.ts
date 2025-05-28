export class Course {
  id: string; // UUID
  course_code: string;
  course_name: string;
  lecturer_name: string;
  created_at: Date;
  updated_at: Date;
  // You can add relationships here if needed, e.g., schedules: Schedule[];
}