import os
import unittest
from io import BytesIO
from urllib.error import URLError
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class OCRTests(unittest.TestCase):
    def test_extracts_text_based_pdf_without_ocr(self):
        with patch.object(main, "extract_text", return_value=("Invoice text", "pdf-text")) as extractor:
            with patch.object(main, "_provider_suggestion", return_value=main.Suggestion(kind="receipt", name="Item")):
                result = main.process_document(b"pdf", "application/pdf")
        self.assertEqual(result.extractedText, "Invoice text")
        self.assertEqual(result.textSource, "pdf-text")
        extractor.assert_called_once()

    def test_image_ocr_path_with_mocked_engine(self):
        from PIL import Image
        import pytesseract
        image = Image.new("RGB", (3, 3), "white")
        encoded = BytesIO()
        image.save(encoded, format="PNG")
        with patch.object(pytesseract, "image_to_string", return_value="image words"):
            text, source = main.extract_text(encoded.getvalue(), "image/png")
        self.assertEqual((text, source), ("image words", "ocr"))

    def test_missing_tesseract_returns_clear_unavailable_state(self):
        from PIL import Image
        import pytesseract
        image = Image.new("RGB", (3, 3), "white")
        encoded = BytesIO()
        image.save(encoded, format="PNG")
        with patch.dict(os.environ, {"TESSERACT_CMD": ""}):
            with patch.object(pytesseract.pytesseract, "tesseract_cmd", "definitely-missing-tesseract.exe"):
                with self.assertRaises(main.ServiceError) as error:
                    main.extract_text(encoded.getvalue(), "image/png")
        self.assertEqual(error.exception.code, "OCR_UNAVAILABLE")

    def test_text_pdf_is_extracted_without_ocr_and_scanned_pdf_uses_ocr(self):
        import fitz
        import pytesseract
        text_pdf = fitz.open()
        text_pdf.new_page().insert_text((72, 72), "Synthetic document words")
        text, source = main.extract_text(text_pdf.tobytes(), "application/pdf")
        self.assertIn("Synthetic document words", text)
        self.assertEqual(source, "pdf-text")

        scanned = fitz.open()
        scanned.new_page()
        with patch.object(pytesseract, "image_to_string", return_value="scan words"):
            scanned_text, scanned_source = main.extract_text(scanned.tobytes(), "application/pdf")
        self.assertEqual((scanned_text, scanned_source), ("scan words", "ocr"))

    def test_ocr_failure_is_reported(self):
        from PIL import Image
        import pytesseract
        image = Image.new("RGB", (3, 3), "white")
        encoded = BytesIO()
        image.save(encoded, format="PNG")
        with patch.object(pytesseract, "image_to_string", side_effect=RuntimeError("OCR failure")):
            with self.assertRaises(main.ServiceError) as error:
                main.extract_text(encoded.getvalue(), "image/png")
        self.assertEqual(error.exception.code, "OCR_FAILED")

    def test_unsupported_and_corrupt_pdf_are_reported(self):
        with self.assertRaises(main.ServiceError) as unsupported:
            main.extract_text(b"data", "application/zip")
        self.assertEqual(unsupported.exception.code, "UNSUPPORTED_FILE")
        with self.assertRaises(main.ServiceError) as corrupt:
            main.extract_text(b"not a pdf", "application/pdf")
        self.assertEqual(corrupt.exception.code, "UNSUPPORTED_FILE")

    def test_empty_text_is_not_presented_as_ai_success(self):
        with patch.object(main, "extract_text", return_value=("", "ocr")):
            with self.assertRaises(main.ServiceError) as error:
                main.process_document(b"image", "image/png")
        self.assertEqual(error.exception.code, "NO_EXTRACTABLE_TEXT")


class ContractAndProviderTests(unittest.TestCase):
    def test_rejects_malformed_ai_output(self):
        with self.assertRaises(Exception):
            main.Suggestion.model_validate({"kind": "receipt", "amount": "abc", "extra": "untrusted"})

    def test_no_provider_is_explicitly_unavailable(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "none", "AI_API_KEY": "", "AI_MODEL": ""}):
            with self.assertRaises(main.ServiceError) as error:
                main._provider_suggestion("text")
        self.assertEqual(error.exception.code, "AI_UNAVAILABLE")

    def test_provider_connection_failure_is_reported(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai_compatible", "AI_API_KEY": "test-only", "AI_MODEL": "mock-model"}):
            with patch("main.urllib.request.urlopen", side_effect=URLError("offline")):
                with self.assertRaises(main.ServiceError) as error:
                    main._provider_suggestion("synthetic text")
        self.assertEqual(error.exception.code, "AI_PROVIDER_FAILED")

    def test_service_token_enforcement(self):
        client = TestClient(main.app)
        with patch.dict(os.environ, {"AI_SERVICE_TOKEN": "local-test-token", "AI_PROVIDER": "none"}):
            self.assertEqual(client.post("/v1/process", content=b"%PDF-test", headers={"Content-Type": "application/pdf"}).status_code, 401)
            response = client.post("/v1/process", content=b"%PDF-test", headers={"Content-Type": "application/pdf", "Authorization": "Bearer local-test-token"})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
