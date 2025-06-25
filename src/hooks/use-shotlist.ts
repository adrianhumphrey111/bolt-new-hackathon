import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useAuth } from './use-auth'

export interface ShotlistItem {
  chunk_id: string
  shot_number: number
  cut_reasoning: string
  quality_notes: string
  precise_timing: {
    end: number
    start: number
    duration: number
  }
  script_segment: string
  content_preview: string
  narrative_purpose: string
}

export interface EdlGenerationJob {
  id: string
  project_id: string
  status: string
  created_at: string
  updated_at: string
  shotlist: ShotlistItem[]
  user_id: string
}

export function useShotlist(projectId?: string) {
  const [shotlist, setShotlist] = useState<ShotlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setShotlist([])
      setLoading(false)
      return
    }

    const fetchShotlist = async () => {
      try {
        setLoading(true)
        setError(null)

        // Query the edl_generation_jobs table (corrected from edl_generation_job)
        const query = supabase
          .from('edl_generation_jobs')
          .select('*')
          .order('created_at', { ascending: false })
        
        // If projectId is provided, filter by it
        if (projectId) {
          query.eq('project_id', projectId)
        }

        const { data, error } = await query.limit(1)

        if (error) {
          console.error('Error fetching shotlist:', error)
          setError(error.message)
          return
        }

        if (!data || data.length === 0) {
          console.log('No shotlist found')
          setShotlist([])
          return
        }

        const job = data[0] as EdlGenerationJob
        
        // Check if shotlist exists and is an array
        if (job.shotlist && Array.isArray(job.shotlist)) {
          console.log(`Found shotlist with ${job.shotlist.length} shots`)
          setShotlist(job.shotlist)
        } else {
          console.log('Shotlist is empty or not in expected format')
          setShotlist([])
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to fetch shotlist')
      } finally {
        setLoading(false)
      }
    }

    fetchShotlist()
  }, [user, projectId, supabase])

  return { shotlist, loading, error }
}