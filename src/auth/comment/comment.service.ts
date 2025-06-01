import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale'; // Indonesian locale
import { CreateCommentDto, VoteType, CommentResponseDto, CommentUserDto, AllCommentsResponseDto } from './comment.dto'; // Consolidate imports from comment.dto
import { VoteCommentDto } from './vote.comment.dto';
import { UserRole } from 'src/users/users.dto'; // Adjust the path as needed to where UserRole is defined

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

  async getCommentsForRoom(roomCode: string, currentUserId?: string): Promise<CommentResponseDto[]> {
    // ... (find room by roomCode - same as before) ...
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !roomData) {
      throw new NotFoundException(`Room with code ${roomCode} not found.`);
    }
    const roomId = roomData.id;


    // Base query for comments
    let query = this.supabase
      .from('room_comments')
      .select(`
        id,
        rating,
        comment_text,
        created_at,
        like_count,  
        dislike_count,  
        profiles (
          id,
          fullname,
          username
        )
        ${currentUserId ? `, comment_votes!left(vote_type)` : ''} -- Conditionally fetch user's vote
      `)
      .eq('room_id', roomId);

    // If currentUserId is provided, filter comment_votes for that user
    if (currentUserId) {
        query = query.eq('comment_votes.user_id', currentUserId);
    }
    
    query = query.order('created_at', { ascending: false }); // Newest first
    const { data: comments, error: commentsError } = await query;


    if (commentsError) {
      console.error('Error fetching comments with votes:', commentsError);
      throw new Error('Could not fetch comments.');
    }

    if (!comments) return [];

    return comments.map((comment: any) => { // Use 'any' or a more specific generated type
      const profile = comment.profiles as { id: string; fullname: string | null; username: string | null; } | null;
      const userDto: CommentUserDto = {
        id: profile?.id || comment.user_id || 'unknown-user-id',
        fullName: profile?.fullname || 'User',
        username: profile?.username || 'unknown_user',
      };

      // Extract user's vote if present (Supabase returns it as an array with !left join)
      let userVote: VoteType | null = null;
      if (comment.comment_votes && Array.isArray(comment.comment_votes) && comment.comment_votes.length > 0) {
          userVote = comment.comment_votes[0].vote_type as VoteType;
      } else if (comment.comment_votes && !Array.isArray(comment.comment_votes)) {
          // If not an array but a single object (depends on exact Supabase client version/behavior for !left)
          userVote = (comment.comment_votes as any).vote_type as VoteType;
      }


      return {
        id: comment.id,
        user: userDto,
        rating: comment.rating,
        commentText: comment.comment_text,
        likeCount: comment.like_count,
        dislikeCount: comment.dislike_count,
        userVote: userVote, // Add the user's vote
        createdAt: new Date(comment.created_at),
        createdAtRelative: formatDistanceToNow(new Date(comment.created_at), {
          addSuffix: true,
          locale: localeId,
        }),
      };
    });
  }

  async voteOnComment(
    commentId: string,
    userId: string,
    voteCommentDto: VoteCommentDto,
  ): Promise<{ message: string; likeCount: number; dislikeCount: number; userVote: VoteType | null }> {
    const { voteType } = voteCommentDto;

    // 1. Check if comment exists
    const { data: commentData, error: commentError } = await this.supabase
      .from('room_comments')
      .select('id, like_count, dislike_count') // Select counts for immediate return
      .eq('id', commentId)
      .single();

    if (commentError || !commentData) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    // 2. Check for existing vote by this user on this comment
    const { data: existingVote, error: voteCheckError } = await this.supabase
      .from('comment_votes')
      .select('id, vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
      console.error('Error checking existing vote:', voteCheckError);
      throw new Error('Could not process vote due to a database error.');
    }

    let message: string;
    let finalUserVote: VoteType | null = voteType as unknown as VoteType;
    if (existingVote) {
      // User has an existing vote
      if (existingVote.vote_type === voteType) {
        // User is clicking the same vote type again (e.g., unliking a liked comment)
        const { error: deleteError } = await this.supabase
          .from('comment_votes')
          .delete()
          .match({ id: existingVote.id });

        if (deleteError) {
          console.error('Error deleting vote:', deleteError);
          throw new Error('Could not remove existing vote.');
        }
        message = `Vote removed.`;
        finalUserVote = null;
      } else {
        // User is changing their vote (e.g., from like to dislike)
        const { error: updateError } = await this.supabase
          .from('comment_votes')
          .update({ vote_type: voteType, updated_at: new Date() })
          .match({ id: existingVote.id });

        if (updateError) {
          console.error('Error updating vote:', updateError);
          throw new Error('Could not update existing vote.');
        }
        message = `Vote changed to ${voteType}.`;
      }
    } else {
      // No existing vote, create a new one
      const { error: insertError } = await this.supabase
        .from('comment_votes')
        .insert({
          comment_id: commentId,
          user_id: userId,
          vote_type: voteType,
        });

      if (insertError) {
        // This could be a unique constraint violation if race condition, but our previous check should mostly prevent it
        console.error('Error inserting new vote:', insertError);
        if (insertError.code === '23505') { // Unique violation
            throw new ConflictException('Vote already submitted in a concurrent request.');
        }
        throw new Error('Could not submit new vote.');
      }
      message = `${voteType.charAt(0).toUpperCase() + voteType.slice(1)}d successfully.`;
    }

    // The triggers will update like_count and dislike_count.
    // For an immediate response, we can re-fetch the comment's counts.
    const { data: updatedCommentData, error: fetchError } = await this.supabase
        .from('room_comments')
        .select('like_count, dislike_count')
        .eq('id', commentId)
        .single();

    if (fetchError || !updatedCommentData) {
        console.error('Error fetching updated vote counts:', fetchError);
        // Return stale counts from before if fetch fails, or handle error
        return {
            message,
            likeCount: commentData.like_count, // Stale, but better than erroring out response
            dislikeCount: commentData.dislike_count,
            userVote: finalUserVote,
        };
    }

    return {
      message,
      likeCount: updatedCommentData.like_count,
      dislikeCount: updatedCommentData.dislike_count,
      userVote: finalUserVote,
    };
  }

  async getAllCommentsAcrossRooms(): Promise<AllCommentsResponseDto[]> {
    const { data: comments, error } = await this.supabase
      .from('room_comments')
      .select(`
        id,
        comment_text,
        rating,
        like_count,
        dislike_count,
        created_at,
        rooms!left ( room_code ), 
        profiles!left ( fullname, username )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all comments:', error);
      throw new Error('Could not fetch all comments.');
    }

    if (!comments) {
      return [];
    }

    return comments.map((comment: any) => {
      // Access joined data using the table names
      const roomData = comment.rooms; 
      const profileData = comment.profiles;

      return {
        commentId: comment.id,
        roomCode: roomData?.room_code || 'N/A', // Handle if roomData is null
        commentText: comment.comment_text,
        rating: comment.rating,
        likeCount: comment.like_count,
        dislikeCount: comment.dislike_count,
        commentedAt: new Date(comment.created_at),
        commentedAtRelative: formatDistanceToNow(new Date(comment.created_at), {
          addSuffix: true,
          locale: localeId,
        }),
        userFullName: profileData?.fullname || 'Unknown User', // Handle if profileData is null
        username: profileData?.username || 'unknown',       // Handle if profileData is null
      };
    });
  }

  async deleteComment(commentId: string): Promise<{ message: string }> {
    // 1. Optional: Verify the comment exists to provide a NotFoundException if it doesn't.
    //    This is good practice even if the guard might have fetched it.
    const { data: existingComment, error: findError } = await this.supabase
      .from('room_comments')
      .select('id') // Only need to check for existence
      .eq('id', commentId)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 row without erroring on 0

    if (findError && findError.code !== 'PGRST116') { // PGRST116 means 0 rows, which !existingComment will catch
        console.error(`Error verifying comment ${commentId} before delete:`, findError);
        throw new Error(`Could not verify comment before deletion. Error: ${findError.message}`);
    }
    
    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    // 2. Proceed with deletion (authorization is assumed to be handled by a Guard)
    const { error: deleteError } = await this.supabase
      .from('room_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error(`Error deleting comment with ID ${commentId}:`, deleteError);
      throw new Error(`Could not delete comment. Error: ${deleteError.message}`);
    }

    // Note: Database triggers for updating room rating (if any) or handling
    // cascaded deletes on 'comment_votes' would still fire as expected.

    return { message: `Comment with ID ${commentId} successfully deleted.` };
  }
}