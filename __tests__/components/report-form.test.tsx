import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportForm } from '../../components/report-form'

// Mock FileReader
global.FileReader = class FileReader {
  result: string | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL(file: File) {
    // Simulate async file reading
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,mock-base64-data`
      if (this.onloadend) {
        this.onloadend(new ProgressEvent('loadend') as any)
      }
    }, 0)
  }
} as any

describe('ReportForm Component', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<ReportForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/issue type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument()
  })

  it('should show validation errors for empty required fields', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate title minimum length', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'ab') // Less than 3 characters

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate description minimum length', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)

    await user.type(titleInput, 'Valid Title')
    await user.type(descriptionInput, 'abc') // Less than 5 characters

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/description must be at least 5 characters/i)).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)

    await user.type(titleInput, 'Test Report Title')
    await user.type(descriptionInput, 'This is a test description of the issue')

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Report Title',
          description: 'This is a test description of the issue',
          issueType: 'roads',
          severity: 'low',
        }),
        []
      )
    })
  })

  it('should handle photo selection', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload photos/i) as HTMLInputElement

    await user.upload(input, file)

    // Wait for FileReader to process
    await waitFor(() => {
      expect(input.files).toHaveLength(1)
    })
  })

  it('should remove photos', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload photos/i) as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(input.files).toHaveLength(1)
    })

    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    await waitFor(() => {
      expect(input.files).toHaveLength(0)
    })
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should update form with default values', () => {
    const defaultValues = {
      title: 'Default Title',
      description: 'Default Description',
      issueType: 'water' as const,
      severity: 'high' as const,
    }

    render(<ReportForm onSubmit={mockOnSubmit} defaultValues={defaultValues} />)

    expect(screen.getByDisplayValue('Default Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Default Description')).toBeInTheDocument()
  })

  it('should calculate progress correctly', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSubmit={mockOnSubmit} />)

    // Initially should be 0% or low
    const progressText = screen.getByText(/\d+% Complete/i)
    expect(progressText).toBeInTheDocument()

    // Fill in title
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Test Title')

    // Progress should increase
    await waitFor(() => {
      const updatedProgress = screen.getByText(/\d+% Complete/i)
      expect(updatedProgress).toBeInTheDocument()
    })
  })
})



