import { useUIStore } from '../../stores/useUIStore';

export function GlobalModal() {
  const modal = useUIStore((state) => state.modal);

  const closeModal = useUIStore((state) => state.closeModal);

  if (modal === null) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" role="dialog">
        <header className="modal-header">
          <h2>Event preview</h2>

          <button aria-label="Close modal" onClick={closeModal} type="button">
            ×
          </button>
        </header>

        <p>Selected event:</p>

        <code>{modal.eventId}</code>
      </section>
    </div>
  );
}
