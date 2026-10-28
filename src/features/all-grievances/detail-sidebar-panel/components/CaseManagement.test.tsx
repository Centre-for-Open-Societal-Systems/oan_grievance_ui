// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../../messages/en.json';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaseManagement } from './CaseManagement';
import { metadataReducer, type MetadataState } from '@/features/metadata/store/metadataSlice';
import type { GrievanceTimelineData } from '../../types';

afterEach(cleanup);

const mockTimelineData: GrievanceTimelineData = {
  ticket_number: 'ET14IN000012026',
  status: 'In Progress',
  escalated: false,
  service_category: 'Seeds',
  assignment: {
    department: 'Inputs Supply & Distribution Agency',
    assigned_to: 'Tigist Alemu',
  },
};

const mockCategories = [
  { category_name: 'Seeds' },
  { category_name: 'Credit' },
  { category_name: 'Market Access' },
] as unknown as NonNullable<MetadataState['grievanceOptions']>['service_categories'];

function renderWithStore(ui: React.ReactElement, categories = mockCategories) {
  const initialMetadataState: MetadataState = {
    submitterOptions: null,
    submitterOptionsStatus: 'idle',
    submitterOptionsError: null,
    grievanceOptions: {
      departments: [],
      submission_channels: [],
      service_categories: categories,
      grievance_types: [],
      statuses: [],
    },
    grievanceOptionsStatus: 'succeeded',
    grievanceOptionsError: null,
    selectedLanguage: 'en',
  };

  const store = configureStore({
    reducer: {
      metadata: metadataReducer,
    },
    preloadedState: {
      metadata: initialMetadataState,
    },
  });
  // `wrapper` (not wrapping `ui` inline) so a test's rerender() keeps the Provider.
  return render(ui, { wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Provider store={store}>{children}</Provider>
      </NextIntlClientProvider>
    ) });
}

describe('CaseManagement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom doesn't implement scrollIntoView, which AnimatedSelect calls on the highlighted option.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders nothing when canManageCase is false', () => {
    const { container } = renderWithStore(
      <CaseManagement
        canManageCase={false}
        timelineData={mockTimelineData}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders category and case management header', () => {
    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={mockTimelineData}
      />
    );

    expect(screen.getByText('Case Management')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('Seeds');
  });

  it('shows message when saving without changes', async () => {
    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={mockTimelineData}
        onReassign={vi.fn()}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/No changes to save/i)).toBeInTheDocument();
    });
  });

  it('shows justification and calls onReassign when category is modified', async () => {
    const onReassign = vi.fn().mockResolvedValue({
      ticket_number: 'ET14IN000012026',
      status: 'Assigned',
      change_request: {
        status: 'Pending',
      },
    });

    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={mockTimelineData}
        onReassign={onReassign}
      />
    );

    // Open Category combobox from the keyboard, then pick Credit
    const combobox = screen.getByRole('combobox', { name: 'Category' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('option', { name: 'Credit' }));

    // Reassignment justification box should appear
    expect(screen.getByText('Reassignment Justification')).toBeInTheDocument();
    expect(
      screen.getByText(/Junior officer reassignment requests will be routed to your supervisor/i)
    ).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Provide justification for routing to this category/i);
    fireEvent.change(reasonInput, { target: { value: 'Dispute relates to farmer credit facility' } });

    // Click Submit Reassignment Request button
    const submitBtn = screen.getByRole('button', { name: /Submit Reassignment Request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onReassign).toHaveBeenCalledWith({
        target_category: 'Credit',
        reason: 'Dispute relates to farmer credit facility',
      });
      expect(
        screen.getByText(/Reassignment request submitted \(pending supervisor approval\)/i)
      ).toBeInTheDocument();
    });
  });

  it('renders read-only category and officer without edit controls when status is terminal', () => {
    const closedTimeline: GrievanceTimelineData = {
      ...mockTimelineData,
      status: 'Closed',
    };

    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={closedTimeline}
      />
    );

    expect(screen.getByText('Case Management')).toBeInTheDocument();
    expect(screen.getByText('Seeds')).toBeInTheDocument();
    expect(screen.getByText('Tigist Alemu')).toBeInTheDocument();
    expect(screen.getByText(/cannot be reassigned/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
  });
});
