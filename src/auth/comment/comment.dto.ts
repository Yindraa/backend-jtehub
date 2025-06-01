
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  @Min(0, { message: 'Rating must be at least 0.' })
  @Max(5, { message: 'Rating must be at most 5.' })
  rating: number;

  @IsString()
  @IsNotEmpty({ message: 'Comment text cannot be empty.' })
  commentText: string;
}

export class CommentUserDto {
  id: string; // This will be the auth.users.id / profiles.id
  fullName: string | null;
  username: string | null;
  // nim?: string | null; // Add this if NIM is added to profiles table and needed
}

export type VoteType = 'upvote' | 'downvote' | null; // Define VoteType as needed

export class CommentResponseDto {
  id: string;
  user: CommentUserDto;
  rating: number;
  commentText: string;
  createdAtRelative: string;
  createdAt: Date;
  userVote?: VoteType | null; // Optional: to indicate current user's vote on this comment
}