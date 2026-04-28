import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type DispatchInviteBody = {
  workspaceId?: string;
  invitedEmail?: string;
  invitationToken?: string;
};

type InvitationContext = {
  workspace_name: string;
  inviter_name: string;
  invitee_name: string;
  role_to_assign: string;
};

function getServiceRoleEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return { url, serviceRoleKey };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DispatchInviteBody;
    const workspaceId = body.workspaceId?.trim();
    const invitedEmail = body.invitedEmail?.trim().toLowerCase();
    const invitationToken = body.invitationToken?.trim();

    if (!workspaceId || !invitedEmail || !invitationToken) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!isValidEmail(invitedEmail)) {
      return NextResponse.json({ error: 'Invalid invited email format.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can dispatch invitation email.' }, { status: 403 });
    }

    const { url, serviceRoleKey } = getServiceRoleEnv();
    const adminClient = createSupabaseClient(url, serviceRoleKey);

    const { data: invitationContextRaw, error: invitationContextError } = await adminClient.rpc(
      'get_workspace_invitation_context',
      { p_token: invitationToken },
    );

    const invitationContext = invitationContextRaw as
      | ({ success: true } & InvitationContext)
      | { success: false; error?: string }
      | null;

    const invitationContextErrorMessage =
      invitationContext && 'success' in invitationContext && invitationContext.success === false
        ? invitationContext.error
        : null;

    if (invitationContextError || !invitationContext || ('success' in invitationContext && !invitationContext.success)) {
      return NextResponse.json(
        {
          error: invitationContextError?.message || invitationContextErrorMessage || 'Failed to load invitation context.',
        },
        { status: 400 },
      );
    }

    const reqUrl = new URL(request.url);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || reqUrl.origin;
    const redirectTo = `${siteUrl}/auth/invite?token=${encodeURIComponent(invitationToken)}`;

    const emailData = {
      full_name: invitationContext.invitee_name,
      workspace_name: invitationContext.workspace_name,
      inviter_name: invitationContext.inviter_name,
      role_to_assign: invitationContext.role_to_assign,
    };

    // Force Invite User flow so the outgoing email always uses Supabase Invite template.
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(invitedEmail, {
      redirectTo,
      data: emailData,
    });

    if (inviteError) {
      const isAlreadyRegistered = /already\s*registered|already\s*exists|has\s*already\s*been\s*registered/i.test(
        inviteError.message,
      );

      if (isAlreadyRegistered) {
        const { error: magicLinkError } = await adminClient.auth.signInWithOtp({
          email: invitedEmail,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: redirectTo,
            data: emailData,
          },
        });

        if (magicLinkError) {
          return NextResponse.json(
            {
              error: 'Invitation exists but failed to send magic link email.',
              details: {
                invite: inviteError.message,
                magicLink: magicLinkError.message,
              },
            },
            { status: 502 },
          );
        }

        return NextResponse.json({ success: true, delivery: 'magic_link', redirectTo });
      }

      return NextResponse.json(
        {
          error: 'Invitation created but failed to send invite email.',
          details: { invite: inviteError.message },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, delivery: 'invite', redirectTo });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispatch invitation email.' },
      { status: 500 },
    );
  }
}
