'use client'

import React, { useState, useEffect } from 'react'
import { FiVideo, FiEye, FiScissors, FiLayers, FiPlay, FiCheck, FiTarget, FiEdit, FiClock, FiAlertCircle } from 'react-icons/fi'

interface EDLGenerationLoaderProps {
  isOpen: boolean
  onClose: () => void
  userIntent: string
  scriptContent?: string
  projectId?: string
}

interface EDLStep {
  agent_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
}

interface JobStatus {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentStep: string
  progress: {
    completed: number
    total: number
    percentage: number
  }
  steps: EDLStep[]
  error?: {
    message: string
    step: string
  }
  results?: {
    finalDuration: number
    scriptCoverage: number
    totalChunks: number
    canCreateTimeline: boolean
  }
}

export default function EDLGenerationLoader({ 
  isOpen, 
  onClose, 
  userIntent, 
  scriptContent,
  projectId 
}: EDLGenerationLoaderProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultSteps: EDLStep[] = [
    {
      agent_name: "SCRIPT_ANALYZER",
      status: "pending",
      started_at: null,
      completed_at: null
    },
    {
      agent_name: "CONTENT_MATCHER",
      status: "pending",
      started_at: null,
      completed_at: null
    },
    {
      agent_name: "EDL_GENERATOR",
      status: "pending",
      started_at: null,
      completed_at: null
    },
    {
      agent_name: "SHOT_LIST_GENERATOR",
      status: "pending",
      started_at: null,
      completed_at: null
    }
  ]

  const [steps, setSteps] = useState<EDLStep[]>(defaultSteps)

  // Start EDL generation job
  const startEDLGeneration = async () => {
    if (!projectId) {
      setError('Project ID is required')
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      const response = await fetch(`/api/timeline/${projectId}/generate-edl-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIntent,
          scriptContent
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start EDL generation')
      }

      setJobStatus({
        jobId: result.jobId,
        status: 'running',
        currentStep: 'Initializing',
        progress: { completed: 0, total: 4, percentage: 0 },
        steps: defaultSteps
      })

      // Start polling for status
      pollJobStatus(result.jobId)

    } catch (error) {
      console.error('Failed to start EDL generation:', error)
      setError(error instanceof Error ? error.message : 'Failed to start EDL generation')
    } finally {
      setIsStarting(false)
    }
  }

  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/timeline/${projectId}/generate-edl-async?jobId=${jobId}`)
      const status = await response.json()

      if (!response.ok) {
        throw new Error(status.error || 'Failed to get job status')
      }

      // Update steps based on API response
      const updatedSteps = steps.map(step => {
        const apiStep = status.steps?.find((s: EDLStep) => 
          s.agent_name === step.agent_name
        )
        
        if (apiStep) {
          return {
            ...step,
            status: apiStep.status,
            started_at: apiStep.started_at,
            completed_at: apiStep.completed_at
          }
        }
        return step
      })

      setSteps(updatedSteps)
      setJobStatus(prev => prev ? { ...prev, ...status } : status)

      // Continue polling if still running
      if (status.status === 'running') {
        setTimeout(() => pollJobStatus(jobId), 2000)
      } else if (status.status === 'completed') {
        // Job completed successfully
        setTimeout(() => {
          onClose()
        }, 2000)
      } else if (status.status === 'failed') {
        setError(status.error?.message || 'EDL generation failed')
      }

    } catch (error) {
      console.error('Error polling job status:', error)
      setError(error instanceof Error ? error.message : 'Failed to check job status')
    }
  }

  // Get icon for each step
  const getStepIcon = (agentName: string) => {
    switch (agentName) {
      case 'SCRIPT_ANALYZER':
        return FiLayers
      case 'CONTENT_MATCHER':
        return FiEye
      case 'EDL_GENERATOR':
        return FiEdit
      case 'SHOT_LIST_GENERATOR':
        return FiScissors
      default:
        return FiTarget
    }
  }

  // Get human-readable name for each step
  const getStepName = (agentName: string) => {
    switch (agentName) {
      case 'SCRIPT_ANALYZER':
        return 'Script Analysis'
      case 'CONTENT_MATCHER':
        return 'Content Matching'
      case 'EDL_GENERATOR':
        return 'EDL Generation'
      case 'SHOT_LIST_GENERATOR':
        return 'Shot List Generation'
      default:
        return agentName
    }
  }

  // Get description for each step
  const getStepDescription = (agentName: string) => {
    switch (agentName) {
      case 'SCRIPT_ANALYZER':
        return 'Breaking down script into dialogue segments and narrative beats...'
      case 'CONTENT_MATCHER':
        return 'Finding video clips that match script segments and dialogue...'
      case 'EDL_GENERATOR':
        return 'Creating editorial decisions with detailed explanations...'
      case 'SHOT_LIST_GENERATOR':
        return 'Generating precise shot list with exact timing...'
      default:
        return 'Processing...'
    }
  }

  // Start generation when modal opens
  useEffect(() => {
    if (isOpen && !jobStatus && !isStarting) {
      startEDLGeneration()
    }
  }, [isOpen, jobStatus, isStarting])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setJobStatus(null)
      setIsStarting(false)
      setError(null)
      setSteps(defaultSteps)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1f2937',
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FiVideo size={24} color="#059669" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669', margin: 0 }}>
                EDL Generation
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
              {isStarting ? 'Starting EDL generation...' : 
               error ? 'EDL generation failed' :
               jobStatus?.status === 'completed' ? 'EDL generated successfully!' :
               'Creating Edit Decision List from your video content'}
            </p>
          </div>

          {/* User Intent */}
          <div style={{ 
            padding: '1rem', 
            background: '#1e3a8a', 
            borderRadius: '0.5rem', 
            border: '1px solid #059669' 
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#93c5fd' }}>
              Video Intent:
            </div>
            <div style={{ fontSize: '0.875rem', color: '#bfdbfe', marginTop: '0.25rem' }}>
              "{userIntent}"
            </div>
            {scriptContent && (
              <>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#93c5fd', marginTop: '0.75rem' }}>
                  Script Provided:
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  {scriptContent.length} characters of script content
                </div>
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div style={{ 
              padding: '1rem', 
              background: '#7f1d1d', 
              borderRadius: '0.5rem', 
              border: '1px solid #dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FiAlertCircle color="#f87171" />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f87171' }}>
                  Generation Failed
                </div>
                <div style={{ fontSize: '0.875rem', color: '#fca5a5', marginTop: '0.25rem' }}>
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {jobStatus && !error && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Overall Progress</span>
                <span style={{ 
                  padding: '0.125rem 0.5rem', 
                  fontSize: '0.75rem', 
                  background: '#374151', 
                  borderRadius: '0.375rem' 
                }}>
                  {jobStatus.progress.percentage}%
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '0.5rem', 
                background: '#374151', 
                borderRadius: '0.25rem', 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${jobStatus.progress.percentage}%`, 
                  background: '#059669', 
                  transition: 'width 0.3s ease' 
                }} />
              </div>
            </div>
          )}

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {steps.map((step) => {
              const IconComponent = getStepIcon(step.agent_name)
              const isActive = step.status === 'running'
              const isCompleted = step.status === 'completed'
              const isFailed = step.status === 'failed'
              const stepName = getStepName(step.agent_name)
              const stepDescription = getStepDescription(step.agent_name)
              
              return (
                <div key={step.agent_name} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isFailed ? '#dc2626' : isCompleted ? '#059669' : isActive ? '#3b82f6' : '#374151',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isFailed ? <FiAlertCircle size={20} /> :
                     isCompleted ? <FiCheck size={20} /> : 
                     <IconComponent size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '500', 
                      color: isFailed ? '#f87171' : isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#9ca3af',
                      marginBottom: '0.25rem'
                    }}>
                      {stepName}
                      {isActive && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          <div style={{
                            display: 'inline-block',
                            width: '1rem',
                            height: '1rem',
                            border: '2px solid #374151',
                            borderTop: '2px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: isActive ? '#d1d5db' : '#9ca3af' 
                    }}>
                      {stepDescription}
                    </div>
                    {step.started_at && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        <FiClock style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {step.completed_at ? (
                          <>
                            Completed: {new Date(step.completed_at).toLocaleTimeString()}
                            <span style={{ color: '#9ca3af', marginLeft: '0.5rem' }}>
                              ({Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)}s)
                            </span>
                          </>
                        ) : (
                          <>Started: {new Date(step.started_at).toLocaleTimeString()}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Results Summary */}
          {jobStatus?.status === 'completed' && jobStatus.results && (
            <div style={{ 
              padding: '1rem', 
              background: '#065f46', 
              borderRadius: '0.5rem', 
              border: '1px solid #059669' 
            }}>
              <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '500', marginBottom: '0.5rem' }}>
                ✅ EDL Generated Successfully!
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.75rem', color: '#a7f3d0' }}>
                <div>Final Duration: {jobStatus.results.finalDuration}s</div>
                <div>Script Coverage: {jobStatus.results.scriptCoverage}%</div>
                <div>Total Clips: {jobStatus.results.totalChunks}</div>
                <div>Timeline Ready: {jobStatus.results.canCreateTimeline ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          {/* Close Button */}
          {(error || jobStatus?.status === 'completed') && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: error ? '#dc2626' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {error ? 'Close' : 'Done'}
              </button>
            </div>
          )}
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    </div>
  )
}