'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

interface Project {
  id: string
  name: string
  created_at: string
  videos: Video[]
}

interface Video {
  id: string
  filename: string
  s3_location: string
  created_at: string
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    
    const getProjects = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            videos (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching projects:', error)
        } else {
          setProjects(data || [])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      getProjects()
    }
  }, [user, authLoading, router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const goToEditor = (projectId?: string) => {
    if (projectId) {
      router.push(`/dashboard/projects/${projectId}/editor`)
    } else {
      router.push('/')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto dark:border-white"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto dark:border-white"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white shadow dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">Welcome back, {user?.email}</p>
            </div>
            <div className="flex space-x-4">
              <Button onClick={() => goToEditor()}>
                Go to Editor
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Projects</h2>
            
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No projects found</p>
                <p className="text-gray-400 dark:text-gray-500 mb-6">Start by going to the editor and uploading some videos</p>
                <Button onClick={() => goToEditor()}>
                  Go to Editor
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {project.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                          {project.videos?.length || 0} videos
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          console.log('Edit button clicked for project:', project.id)
                          e.stopPropagation()
                          goToEditor(project.id)
                        }}
                        className="ml-4"
                      >
                        Edit
                      </Button>
                    </div>
                    
                    {project.videos && project.videos.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Videos:</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {project.videos.slice(0, 3).map((video) => (
                            <li key={video.id} className="truncate">
                              {video.filename}
                            </li>
                          ))}
                          {project.videos.length > 3 && (
                            <li className="text-gray-500 dark:text-gray-500">
                              +{project.videos.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}