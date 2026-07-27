/**
 * Supporting UI component for the Comment extension (inline comments and annotations). Provides part of the in-editor interface for this feature.
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, CheckCircle2, MessageCircle } from 'lucide-react';
import type { CommentData, CommentReply } from '../Comment';

interface CommentViewProps {
  comment: CommentData;
  onUpdate: (updatedComment: CommentData) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onRemove: (commentId: string) => void;
}

export const CommentView: React.FC<CommentViewProps> = ({
  comment,
  onUpdate,
  onResolve,
  onRemove,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const handleAddReply = useCallback(() => {
    if (!replyText.trim()) return;

    const newReply: CommentReply = {
      id: `reply-${Date.now()}`,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorColor: comment.authorColor,
      text: replyText,
      timestamp: Date.now(),
    };

    onUpdate({
      ...comment,
      replies: [...(comment.replies || []), newReply],
    });

    setReplyText('');
  }, [replyText, comment, onUpdate]);

  const handleSaveEdit = useCallback(() => {
    if (!editText.trim()) return;

    onUpdate({
      ...comment,
      text: editText,
    });

    setIsEditing(false);
  }, [editText, comment, onUpdate]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      '#FF6B6B': 'bg-red-100',
      '#4ECDC4': 'bg-cyan-100',
      '#45B7D1': 'bg-blue-100',
      '#FFA07A': 'bg-orange-100',
      '#98D8C8': 'bg-emerald-100',
      '#F7DC6F': 'bg-yellow-100',
      '#BB8FCE': 'bg-purple-100',
      '#4F46E5': 'bg-indigo-100',
    };
    return colorMap[color] || 'bg-indigo-100';
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getColorClass(comment.authorColor)} hover:opacity-80 transition-opacity cursor-pointer`}
        title={`Comment by ${comment.authorName}`}
      >
        <MessageCircle className="w-3 h-3" />
        <span>{comment.replies?.length || 0}</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={getColorClass(comment.authorColor)}>
                    {getInitials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <DialogTitle className="text-sm">{comment.authorName}</DialogTitle>
                  <span className="text-xs text-gray-500">{formatDate(comment.timestamp)}</span>
                </div>
              </div>
              {comment.resolved && <Badge variant="secondary">Resolved</Badge>}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {!isEditing ? (
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm">{comment.text}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Edit comment..."
                  className="min-h-24"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditText(comment.text);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                </div>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="space-y-3 border-t pt-3">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className={getColorClass(reply.authorColor)}>
                        {getInitials(reply.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{reply.authorName}</span>
                        <span className="text-xs text-gray-500">{formatDate(reply.timestamp)}</span>
                      </div>
                      <p className="text-sm mt-1">{reply.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!comment.resolved && (
              <div className="border-t pt-3 space-y-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Add a reply..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleAddReply();
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setReplyText('')}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={handleAddReply} disabled={!replyText.trim()}>
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolve(comment.id, !comment.resolved)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {comment.resolved ? 'Reopen' : 'Resolve'}
              </Button>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onRemove(comment.id);
                setIsOpen(false);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface CommentPanelProps {
  comments: CommentData[];
  onUpdate: (comment: CommentData) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onRemove: (commentId: string) => void;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  comments,
  onUpdate,
  onResolve,
  onRemove,
}) => {
  const activeComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  return (
    <div className="space-y-4">
      {activeComments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Active Comments ({activeComments.length})</h3>
          <div className="space-y-2">
            {activeComments.map((comment) => (
              <CommentView
                key={comment.id}
                comment={comment}
                onUpdate={onUpdate}
                onResolve={onResolve}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      )}

      {resolvedComments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">
            Resolved Comments ({resolvedComments.length})
          </h3>
          <div className="space-y-2">
            {resolvedComments.map((comment) => (
              <CommentView
                key={comment.id}
                comment={comment}
                onUpdate={onUpdate}
                onResolve={onResolve}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      )}

      {comments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No comments yet</p>
        </div>
      )}
    </div>
  );
};
