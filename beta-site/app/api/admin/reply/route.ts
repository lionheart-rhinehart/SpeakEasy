import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { feedbackId, email, name, message } = await request.json();

    if (!feedbackId || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Send reply email (if Resend is configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const adminEmail = process.env.ADMIN_EMAIL;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Re: Your SpeakEasy Feedback',
          reply_to: adminEmail || fromEmail,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <p>Hi ${name},</p>
              <p>Thank you for your feedback! Here's our response:</p>
              <div style="background: #f8fafc; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <p>If you have any more questions or feedback, just reply to this email.</p>
              <p>Thanks for being a beta tester!</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 40px;">
                — The SpeakEasy Team
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send email (continuing anyway):', emailError);
      }
    }

    // Update feedback status AND save the reply for in-app viewing
    const { error: updateError } = await supabase
      .from('feedback')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        admin_reply: message,
        admin_reply_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Failed to update feedback:', updateError);
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}

// Update feedback status
export async function PATCH(request: NextRequest) {
  try {
    const { feedbackId, status } = await request.json();

    if (!feedbackId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = { status };
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', feedbackId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
