import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// This is a placeholder API endpoint for EDL generation
// In production, this would integrate with the actual Lambda function

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { userIntent, scriptContent } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!userIntent) {
      return NextResponse.json(
        { error: 'User intent is required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with user session
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Log the project ID for debugging
    console.log('Processing EDL generation for project:', projectId);
    console.log('User:', user.id);
    console.log('User intent:', userIntent);
    console.log('Script content length:', scriptContent ? scriptContent.length : 0);

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id) // Make sure user owns this project
      .single();

    if (projectError || !project) {
      console.log('Project query error:', projectError);
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    console.log('Project found:', project.title || project.name || 'Untitled');

    // Generate a job ID for tracking
    const jobId = `edl_${projectId}_${Date.now()}`;

    // Log the request for now (in production, this would trigger the Lambda)
    console.log('EDL Generation Request:', {
      jobId,
      projectId,
      userIntent,
      scriptContent: scriptContent ? `${scriptContent.length} characters` : 'None',
    });

    // TODO: Integrate with actual EDL generation Lambda function
    // For now, return a mock job ID
    
    return NextResponse.json({
      jobId,
      status: 'started',
      message: 'EDL generation job started successfully'
    });

  } catch (error) {
    console.error('Error starting EDL generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with user session
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: Check actual job status from database or job queue
    // For now, return a mock status
    
    const mockProgress = Math.min(100, Math.floor((Date.now() % 30000) / 300));
    const isCompleted = mockProgress >= 95;
    
    const mockStatus = {
      jobId,
      status: isCompleted ? 'completed' : 'running',
      currentStep: isCompleted ? 'Completed' : 'Processing',
      progress: {
        completed: isCompleted ? 4 : Math.floor(mockProgress / 25),
        total: 4,
        percentage: mockProgress
      },
      steps: [
        {
          agent_name: 'SCRIPT_ANALYZER',
          status: mockProgress > 25 ? 'completed' : mockProgress > 0 ? 'running' : 'pending',
          started_at: new Date().toISOString(),
          completed_at: mockProgress > 25 ? new Date().toISOString() : null
        },
        {
          agent_name: 'CONTENT_MATCHER',
          status: mockProgress > 50 ? 'completed' : mockProgress > 25 ? 'running' : 'pending',
          started_at: mockProgress > 25 ? new Date().toISOString() : null,
          completed_at: mockProgress > 50 ? new Date().toISOString() : null
        },
        {
          agent_name: 'EDL_GENERATOR',
          status: mockProgress > 75 ? 'completed' : mockProgress > 50 ? 'running' : 'pending',
          started_at: mockProgress > 50 ? new Date().toISOString() : null,
          completed_at: mockProgress > 75 ? new Date().toISOString() : null
        },
        {
          agent_name: 'SHOT_LIST_GENERATOR',
          status: isCompleted ? 'completed' : mockProgress > 75 ? 'running' : 'pending',
          started_at: mockProgress > 75 ? new Date().toISOString() : null,
          completed_at: isCompleted ? new Date().toISOString() : null
        }
      ]
    };

    if (isCompleted) {
      mockStatus.results = {
        finalDuration: 120,
        scriptCoverage: 85,
        totalChunks: 12,
        canCreateTimeline: true
      };
    }

    return NextResponse.json(mockStatus);

  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}