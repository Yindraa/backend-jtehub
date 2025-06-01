import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale'; // Indonesian locale
import { CreateCommentDto } from './comment.dto';
import { CommentResponseDto, CommentUserDto } from './comment.dto'; // Assuming these DTOs are defined in comment.dto.ts

@Injectable()
export class commentsService {
  private supabase: SupabaseClient;
  
      constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
    
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase URL and Key must be provided');
        }
    
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }

  async addCommentToRoom(
    roomCode: string,
    userId: string, // This is auth.users.id
    createCommentDto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    // 1. Find room by roomCode (same as before)
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !roomData) {
      throw new NotFoundException(`Room with code ${roomCode} not found.`);
    }
    const roomId = roomData.id;

    // 2. Fetch user profile details from 'profiles' table
    const { data: profileData, error: profileError } = await this.supabase
      .from('profiles') // Query 'profiles' table
      .select('id, fullname, username') // Add 'nim' here if it exists in profiles
      .eq('id', userId) // userId from auth matches profiles.id
      .single();

    if (profileError || !profileData) {
      // This might indicate an issue if a user exists in auth.users but not in profiles
      // Or if the userId is somehow invalid.
      console.warn(`Profile not found for user ID ${userId}. Comment will be created, but user details might be incomplete if not handled.`, profileError);
      // Depending on policy, you might throw NotFoundException here.
      // For now, we'll let the comment be created, and the DTO will handle potentially null profile fields.
      // throw new NotFoundException(`Profile not found for user ID ${userId}.`);
    }

    // 3. Create the comment (user_id is auth.users.id)
    const { data: newComment, error: commentInsertError } = await this.supabase
      .from('room_comments')
      .insert({
        room_id: roomId,
        user_id: userId,
        rating: createCommentDto.rating,
        comment_text: createCommentDto.commentText,
      })
      .select()
      .single();

    if (commentInsertError) {
      console.error('Error creating comment:', commentInsertError);
      throw new Error('Could not create comment.');
    }

    // 4. Format response using profileData if available
    const userDto: CommentUserDto = {
      id: userId, // The ID of the user who commented
      fullName: profileData?.fullname || 'User', // Fallback if profile not fully synced/found
      username: profileData?.username || 'unknown_user',
      // nim: profileData?.nim || null, // Uncomment and use if NIM is in profiles
    };

    return {
      id: newComment.id,
      user: userDto,
      rating: newComment.rating,
      commentText: newComment.comment_text,
      createdAt: newComment.created_at,
      createdAtRelative: formatDistanceToNow(new Date(newComment.created_at), {
        addSuffix: true,
        locale: localeId,
      }),
    };
  }

  async getCommentsForRoom(roomCode: string): Promise<CommentResponseDto[]> {
    // 1. Find room by roomCode (same as before)
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !roomData) {
      throw new NotFoundException(`Room with code ${roomCode} not found.`);
    }
    const roomId = roomData.id;

    // 2. Fetch comments, joining with 'profiles' table
    // The join is on room_comments.user_id = profiles.id
    const { data: comments, error: commentsError } = await this.supabase
      .from('room_comments')
      .select(`
        id,
        user_id,
        rating,
        comment_text,
        created_at,
        profiles (
          id,
          fullname,
          username
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw new Error('Could not fetch comments.');
    }

    if (!comments) return [];
us
    return comments.map((comment) => {
      // Supabase returns the related 'profiles' record as an object here.
      // If 'profiles' is null (e.g., user_id in room_comments is stale or RLS issue), provide fallbacks.
      const profileArray = comment.profiles as any;
      const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray as { id: string; fullname: string | null; username: string | null; nim?: string | null; } | null;

      const userDto: CommentUserDto = {
        id: profile?.id || comment.user_id || 'unknown-user-id', // Fallback to user_id from comment if profile is missing
        fullName: profile?.fullname || 'User',
        username: profile?.username || 'unknown_user',
        // nim: profile?.nim || null, // Uncomment and use if NIM is in profiles
      };

      return {
        id: comment.id,
        user: userDto,
        rating: comment.rating,
        commentText: comment.comment_text,
        createdAt: comment.created_at,
        createdAtRelative: formatDistanceToNow(new Date(comment.created_at), {
          addSuffix: true,
          locale: localeId,
        }),
      };
    });
  }
}