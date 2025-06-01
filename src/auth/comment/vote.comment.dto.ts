import { IsEnum, IsNotEmpty } from 'class-validator';

// Ensure this enum matches your PostgreSQL ENUM or the values you use (e.g., 1, -1)
export enum VoteType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

export class VoteCommentDto {
  @IsNotEmpty()
  @IsEnum(VoteType, { message: 'Vote type must be either "like" or "dislike".' })
  voteType: VoteType;
}