import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// EDL generation API endpoint that integrates with AWS Lambda function

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

    // Generate a job ID
    const jobId = crypto.randomUUID();

    // Check if there's already a running job for this project
    const { data: existingJob } = await supabase
      .from('edl_generation_jobs')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: 'running',
        message: 'EDL generation already in progress for this project'
      });
    }

    // Create the EDL generation job record in the database
    const { data: edlJob, error: edlJobError } = await supabase
      .from('edl_generation_jobs')
      .insert({
        id: jobId,
        project_id: projectId,
        user_id: user.id,
        status: 'pending',
        user_intent: userIntent,
        script_content: scriptContent || '',
        current_step: 'initializing',
        total_steps: 4,
        completed_steps: 0
      })
      .select()
      .single();

    if (edlJobError) {
      console.error('Error creating EDL generation job:', edlJobError);
      return NextResponse.json(
        { error: 'Failed to create EDL generation job' },
        { status: 500 }
      );
    }

    // Create the initial steps in the edl_generation_steps table
    const steps = [
      { step_number: 1, agent_name: 'SCRIPT_ANALYZER', step_name: 'Script Analysis' },
      { step_number: 2, agent_name: 'CONTENT_MATCHER', step_name: 'Content Matching' },
      { step_number: 3, agent_name: 'EDL_GENERATOR', step_name: 'EDL Generation' },
      { step_number: 4, agent_name: 'SHOT_LIST_GENERATOR', step_name: 'Shot List Generation' }
    ];

    // Create the initial steps using service role to bypass RLS
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    );

    const { error: stepsError } = await supabaseAdmin
      .from('edl_generation_steps')
      .insert(
        steps.map(step => ({
          job_id: jobId,
          ...step,
          status: 'pending'
        }))
      );

    if (stepsError) {
      console.error('Error creating EDL generation steps:', stepsError);
      // Clean up the job if steps creation failed
      await supabase
        .from('edl_generation_jobs')
        .delete()
        .eq('id', jobId);
      
      return NextResponse.json(
        { error: 'Failed to create EDL generation steps' },
        { status: 500 }
      );
    }

    console.log('EDL generation job and steps created:', jobId);

    // Call the AWS Lambda function
    try {
      // Update job status to running
      await supabase
        .from('edl_generation_jobs')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString(),
          current_step: 'script_analysis'
        })
        .eq('id', jobId);

      // Prepare the lambda payload
      const lambdaPayload = {
        project_id: projectId,
        user_intent: userIntent,
        job_id: jobId,
        script_content: scriptContent || ''
      };

      console.log('Calling Lambda function with payload:', {
        project_id: projectId,
        user_intent: userIntent,
        job_id: jobId,
        script_content_length: scriptContent ? scriptContent.length : 0
      });

      // Call the AWS Lambda function asynchronously (fire and forget)
      fetch(process.env.EDL_LAMBDA_ENDPOINT!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lambdaPayload)
      }).then(lambdaResponse => {
        if (lambdaResponse.ok) {
          console.log('Lambda function invoked successfully');
        } else {
          console.error(`Lambda function returned ${lambdaResponse.status}: ${lambdaResponse.statusText}`);
        }
      }).catch(error => {
        console.error('Lambda function invocation failed:', error);
      });

      console.log('Lambda function called asynchronously');

    } catch (lambdaError) {
      console.error('Lambda function call failed:', lambdaError);
      
      // Update job status to failed
      await supabase
        .from('edl_generation_jobs')
        .update({ 
          status: 'failed',
          error_message: lambdaError instanceof Error ? lambdaError.message : 'Lambda function call failed',
          error_step: 'lambda_invocation',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'EDL generation failed',
        message: lambdaError instanceof Error ? lambdaError.message : 'Lambda function call failed',
        jobId
      }, { status: 500 });
    }
    
    return NextResponse.json({
      jobId,
      status: 'running',
      message: 'EDL generation started successfully'
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

    // Get the job and its steps from the database
    const { data: job, error: jobError } = await supabase
      .from('edl_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id) // Ensure user owns this job
      .single();

    if (jobError || !job) {
      console.log('Job not found or access denied:', jobError);
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get the job steps
    const { data: steps, error: stepsError } = await supabase
      .from('edl_generation_steps')
      .select('*')
      .eq('job_id', jobId)
      .order('step_number', { ascending: true });

    if (stepsError) {
      console.error('Error fetching job steps:', stepsError);
      return NextResponse.json(
        { error: 'Failed to fetch job steps' },
        { status: 500 }
      );
    }

    // Calculate progress
    const completedSteps = steps?.filter(step => step.status === 'completed').length || 0;
    const totalSteps = job.total_steps || 4;
    const percentage = Math.round((completedSteps / totalSteps) * 100);

    // Prepare the response
    const status = {
      jobId,
      status: job.status,
      currentStep: job.current_step || 'initializing',
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percentage: percentage
      },
      steps: steps?.map(step => ({
        agent_name: step.agent_name,
        status: step.status,
        started_at: step.started_at,
        completed_at: step.completed_at
      })) || [],
      error: job.error_message ? {
        message: job.error_message,
        step: job.error_step || 'unknown'
      } : undefined
    };

    // Add results if job is completed
    if (job.status === 'completed') {
      status.results = {
        finalDuration: job.final_video_duration || 0,
        scriptCoverage: job.script_coverage_percentage || 0,
        totalChunks: job.total_chunks_count || (job.shot_list?.length || 0),
        canCreateTimeline: job.shot_list && Array.isArray(job.shot_list) && job.shot_list.length > 0
      };
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}