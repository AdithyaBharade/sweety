import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthForm from '../AuthForm';

const login = vi.fn();
const register = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, login, register }) }));

describe('AuthForm', () => {
  beforeEach(() => {
    login.mockReset().mockResolvedValue(undefined);
    register.mockReset().mockResolvedValue(undefined);
  });

  it('shows every sign-up problem at once and does not call the API', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the user edits that field', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Asha');
    expect(screen.queryByText('Please enter your name.')).not.toBeInTheDocument();
    expect(screen.getByText('Please enter your email.')).toBeInTheDocument();
  });

  it('submits a valid sign-up', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(register).toHaveBeenCalledWith('Asha', 'asha@example.com', 'secret123');
  });

  it('only requires email and password to log in (no length rules)', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Please enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'old@user.dev');
    await user.type(screen.getByLabelText('Password'), 'abc'); // old short passwords must still work
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(login).toHaveBeenCalledWith('old@user.dev', 'abc');
  });

  it('shows the server message next to the right field', async () => {
    const { AxiosError } = await import('axios');
    register.mockRejectedValue(
      new AxiosError('conflict', '409', undefined, undefined, {
        status: 409,
        data: { error: 'An account with this email already exists.', field: 'email' },
      } as never)
    );
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'taken@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
