"""SIH transmission adapter.

This module isolates the hospital SIH integration so a real HL7/FHIR connector
can replace SimulatedSIHAdapter without changing the API or frontend.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class SIHTransmissionError(Exception):
    """Raised when the SIH connector fails to accept a consultation."""


@dataclass
class SIHTransmissionResult:
    success: bool
    transmission_id: str
    timestamp: datetime
    message: str
    adapter: str


class BaseSIHAdapter:
    """Contract for SIH connectors."""

    name = "base"

    def send_consultation(self, payload: dict) -> SIHTransmissionResult:
        raise NotImplementedError


class SimulatedSIHAdapter(BaseSIHAdapter):
    """
    Development / placeholder SIH connector.

    Generates a deterministic transmission identifier from the consultation id.
    Replace this class with a real SIH client implementing the same interface.
    """

    name = "simulated"

    def send_consultation(self, payload: dict) -> SIHTransmissionResult:
        consultation_id = payload.get("consultation_id")
        if not consultation_id:
            raise SIHTransmissionError("Identifiant de consultation manquant pour le SIH")

        # Simulated acceptance — no external network call.
        now = datetime.now(timezone.utc)
        tx_id = f"#TX-{str(consultation_id)[:8].upper()}"
        logger.info(
            "SIH adapter=%s accepted consultation_id=%s transmission_id=%s",
            self.name,
            consultation_id,
            tx_id,
        )
        return SIHTransmissionResult(
            success=True,
            transmission_id=tx_id,
            timestamp=now,
            message="Transmission acceptée par l'adaptateur SIH (simulé).",
            adapter=self.name,
        )


# Swap this instance for a real connector in production wiring.
sih_adapter: BaseSIHAdapter = SimulatedSIHAdapter()
