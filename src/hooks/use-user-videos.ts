'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from './use-auth'

interface UserVideo {
  id: string
  file_name: string
  original_name: string
  s3_location: string
  thumbnail_url?: string
  duration?: number
  created_at: string
  project_id: string
}

export function useUserVideos(projectId: string) {
  console.log({projectId})
  const [videos, setVideos] = useState<UserVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  
  // Memoize supabase client to prevent recreating on every render
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user?.id) {
      setVideos([])
      setLoading(false)
      return
    }

    const fetchUserVideos = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch videos directly - RLS policies will filter to user's videos only
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false })
          .eq('project_id', projectId)

        if (error) {
          console.error('Error fetching user videos:', error)
          setError(error.message)
        } else {
          setVideos(data || [])
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to fetch videos')
      } finally {
        setLoading(false)
      }
    }

    if(videos.length === 0 ){
      fetchUserVideos()
    }
    

    // Note: Real-time subscriptions removed to avoid WebSocket connection issues
    // Videos will be refreshed when component remounts
  }, [user]) // Only depend on user.id, not the full user object

  const generateSignedUrl = async (s3Location: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-signed-url', {
        body: { s3Location }
      })

      if (error) {
        console.error('Error generating signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (err) {
      console.error('Error:', err)
      return null
    }
  }

  return { videos, loading, error, generateSignedUrl }
}