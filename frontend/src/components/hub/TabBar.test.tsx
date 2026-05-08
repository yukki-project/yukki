import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabBar } from './TabBar';
import { useTabsStore } from '@/stores/tabs';

vi.mock('../../../wailsjs/go/main/App', () => ({
  SwitchProject: vi.fn().mockResolvedValue(undefined),
  CloseProject: vi.fn().mockResolvedValue(undefined),
  OpenProject: vi.fn().mockResolvedValue({ Path: '/new', Name: 'new', LastOpened: '' }),
  ReorderProjects: vi.fn().mockResolvedValue(undefined),
}));

const p = (path: string, name: string) => ({
  path,
  name,
  lastOpened: '2026-05-06T00:00:00Z',
});

beforeEach(() => {
  useTabsStore.setState({ openedProjects: [], activeIndex: -1, recentProjects: [] });
  vi.clearAllMocks();
});

describe('TabBar', () => {
  it('renders nothing when no projects are open', () => {
    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders tabs for each opened project', () => {
    useTabsStore.setState({
      openedProjects: [p('/a', 'alpha'), p('/b', 'beta')],
      activeIndex: 0,
    });
    render(<TabBar />);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('clicking a tab calls SwitchProject and setActive', async () => {
    const { SwitchProject } = await import('../../../wailsjs/go/main/App');
    useTabsStore.setState({
      openedProjects: [p('/a', 'alpha'), p('/b', 'beta')],
      activeIndex: 0,
    });
    render(<TabBar />);
    fireEvent.click(screen.getByRole('tab', { name: /beta/ }));
    await waitFor(() => expect(SwitchProject).toHaveBeenCalledWith(1));
  });

  it('clicking X button calls CloseProject', async () => {
    const { CloseProject } = await import('../../../wailsjs/go/main/App');
    useTabsStore.setState({
      openedProjects: [p('/a', 'alpha')],
      activeIndex: 0,
    });
    render(<TabBar />);
    fireEvent.click(screen.getByRole('button', { name: /Close project alpha/i }));
    await waitFor(() => expect(CloseProject).toHaveBeenCalledWith(0));
  });

  it('clicking + button calls OpenProject', async () => {
    const { OpenProject } = await import('../../../wailsjs/go/main/App');
    useTabsStore.setState({
      openedProjects: [p('/a', 'alpha')],
      activeIndex: 0,
    });
    render(<TabBar />);
    fireEvent.click(screen.getByRole('button', { name: /Open project/i }));
    await waitFor(() => expect(OpenProject).toHaveBeenCalledWith(''));
  });
});
