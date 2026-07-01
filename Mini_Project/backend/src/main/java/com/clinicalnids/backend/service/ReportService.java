package com.clinicalnids.backend.service;

import com.clinicalnids.backend.dto.DatasetAnalysisResponse;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 22, Font.BOLD, new Color(30, 64, 175));
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 12, Font.NORMAL, Color.GRAY);
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(30, 64, 175));
    private static final Font LABEL_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, Color.DARK_GRAY);
    private static final Font VALUE_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
    private static final Font TABLE_HEADER = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);

    /**
     * Generate a PDF security analysis report from the analysis result.
     */
    public byte[] generatePdfReport(DatasetAnalysisResponse analysis) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            // ── Title ──────────────────────────────────────────────
            Paragraph title = new Paragraph("Clinical-NIDS Security Analysis Report", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            document.add(title);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            Paragraph subtitle = new Paragraph("Generated: " + timestamp, SUBTITLE_FONT);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            addSeparator(document);

            // ── Dataset Information ────────────────────────────────
            addSection(document, "1. Dataset Information");

            PdfPTable dsTable = createInfoTable(2);
            addInfoRow(dsTable, "Filename", safe(analysis.getFilename()));
            addInfoRow(dsTable, "Total Records", String.valueOf(safeLong(analysis.getTotalRecords())));
            addInfoRow(dsTable, "Total Columns", String.valueOf(safeInt(analysis.getTotalColumns())));
            addInfoRow(dsTable, "Features Used", String.valueOf(safeInt(analysis.getFeaturesCount())));
            addInfoRow(dsTable, "Missing Values", String.valueOf(safeLong(analysis.getMissingValues())));
            addInfoRow(dsTable, "Duplicate Records", String.valueOf(safeLong(analysis.getDuplicateRecords())));
            document.add(dsTable);
            document.add(new Paragraph(" "));

            // ── Model Information ──────────────────────────────────
            addSection(document, "2. Model Information");

            PdfPTable modelTable = createInfoTable(2);
            addInfoRow(modelTable, "Model", "XGBoost NIDS Classifier");
            addInfoRow(modelTable, "Accuracy", String.format("%.2f%%", safeDouble(analysis.getModelAccuracy()) * 100));
            addInfoRow(modelTable, "Explainability", "SHAP (SHapley Additive exPlanations)");
            document.add(modelTable);
            document.add(new Paragraph(" "));

            // ── Security Summary ───────────────────────────────────
            addSection(document, "3. Security Summary");

            PdfPTable secTable = createInfoTable(2);
            addInfoRow(secTable, "Total Traffic Analyzed", String.valueOf(safeLong(analysis.getTotalRecords())));
            addInfoRow(secTable, "Normal Traffic", String.valueOf(safeLong(analysis.getNormalCount())));
            addInfoRow(secTable, "Detected Attacks", String.valueOf(safeLong(analysis.getAttackCount())));
            addInfoRow(secTable, "Average Confidence", String.format("%.2f%%", safeDouble(analysis.getAvgConfidence()) * 100));
            addInfoRow(secTable, "Overall Risk Level", safe(analysis.getRiskLevel()));
            document.add(secTable);
            document.add(new Paragraph(" "));

            // ── Attack Distribution ────────────────────────────────
            addSection(document, "4. Attack Distribution");

            Map<String, Long> attackDist = analysis.getAttackDistribution();
            if (attackDist != null && !attackDist.isEmpty()) {
                PdfPTable attackTable = new PdfPTable(3);
                attackTable.setWidthPercentage(100);
                attackTable.setWidths(new float[]{40, 30, 30});

                addTableHeader(attackTable, "Attack Type");
                addTableHeader(attackTable, "Count");
                addTableHeader(attackTable, "Percentage");

                long totalAttacks = safeLong(analysis.getAttackCount());
                for (Map.Entry<String, Long> entry : attackDist.entrySet()) {
                    if ("Benign".equals(entry.getKey())) continue;
                    addTableCell(attackTable, entry.getKey());
                    addTableCell(attackTable, String.valueOf(entry.getValue()));
                    double pct = totalAttacks > 0 ? (entry.getValue() * 100.0 / totalAttacks) : 0;
                    addTableCell(attackTable, String.format("%.1f%%", pct));
                }
                document.add(attackTable);
            }
            document.add(new Paragraph(" "));

            // ── Severity Distribution ──────────────────────────────
            addSection(document, "5. Severity Distribution");

            Map<String, Long> sevDist = analysis.getSeverityDistribution();
            if (sevDist != null && !sevDist.isEmpty()) {
                PdfPTable sevTable = new PdfPTable(2);
                sevTable.setWidthPercentage(100);
                sevTable.setWidths(new float[]{50, 50});

                addTableHeader(sevTable, "Severity Level");
                addTableHeader(sevTable, "Count");

                for (Map.Entry<String, Long> entry : sevDist.entrySet()) {
                    addTableCell(sevTable, entry.getKey());
                    addTableCell(sevTable, String.valueOf(entry.getValue()));
                }
                document.add(sevTable);
            }
            document.add(new Paragraph(" "));

            // ── Attack Details with SHAP ───────────────────────────
            addSection(document, "6. Attack Category Details");

            List<DatasetAnalysisResponse.AttackDetailDto> details = analysis.getAttackDetails();
            if (details != null) {
                for (DatasetAnalysisResponse.AttackDetailDto detail : details) {
                    Paragraph attackTitle = new Paragraph(
                            detail.getAttackType() + " — " + detail.getCount() + " occurrences",
                            LABEL_FONT
                    );
                    attackTitle.setSpacingBefore(8);
                    attackTitle.setSpacingAfter(4);
                    document.add(attackTitle);

                    PdfPTable detailTable = createInfoTable(2);
                    addInfoRow(detailTable, "Average Confidence",
                            String.format("%.2f%%", safeDouble(detail.getAverageConfidence()) * 100));
                    addInfoRow(detailTable, "Severity", safe(detail.getSeverity()));

                    if (detail.getTopFeatures() != null && !detail.getTopFeatures().isEmpty()) {
                        String features = detail.getTopFeatures().stream()
                                .map(f -> f.getName() + " (" + f.getLevel() + ")")
                                .reduce((a, b) -> a + ", " + b)
                                .orElse("N/A");
                        addInfoRow(detailTable, "Key Factors", features);
                    }
                    document.add(detailTable);
                }
            }
            document.add(new Paragraph(" "));

            // ── Top Important Features ─────────────────────────────
            addSection(document, "7. Top Important Features (Global SHAP)");

            List<DatasetAnalysisResponse.FeatureImportanceDto> globalFeats = analysis.getGlobalFeatureImportance();
            if (globalFeats != null && !globalFeats.isEmpty()) {
                PdfPTable featTable = new PdfPTable(3);
                featTable.setWidthPercentage(100);
                featTable.setWidths(new float[]{40, 30, 30});

                addTableHeader(featTable, "Feature");
                addTableHeader(featTable, "Impact Score");
                addTableHeader(featTable, "Importance");

                for (DatasetAnalysisResponse.FeatureImportanceDto feat : globalFeats) {
                    addTableCell(featTable, safe(feat.getName()));
                    addTableCell(featTable, String.format("%.4f", safeDouble(feat.getImpact())));
                    addTableCell(featTable, safe(feat.getLevel()));
                }
                document.add(featTable);
            }
            document.add(new Paragraph(" "));

            // ── Risk Summary ───────────────────────────────────────
            addSection(document, "8. Risk Summary & Recommendations");

            String riskLevel = safe(analysis.getRiskLevel());
            String riskText;
            switch (riskLevel) {
                case "CRITICAL":
                    riskText = "CRITICAL RISK: Immediate action required. Multiple high-confidence attack detections. " +
                            "Recommend blocking identified source IPs and escalating to incident response team.";
                    break;
                case "HIGH":
                    riskText = "HIGH RISK: Significant threat activity detected. Review firewall rules and " +
                            "update intrusion prevention signatures. Investigate flagged traffic patterns.";
                    break;
                case "MEDIUM":
                    riskText = "MEDIUM RISK: Some suspicious activity detected. Continue monitoring and " +
                            "review flagged events during next security audit.";
                    break;
                default:
                    riskText = "LOW RISK: Traffic patterns are predominantly normal. Continue standard monitoring.";
            }

            Paragraph riskPara = new Paragraph(riskText, VALUE_FONT);
            riskPara.setSpacingAfter(10);
            document.add(riskPara);

            // ── Footer ─────────────────────────────────────────────
            addSeparator(document);
            Paragraph footer = new Paragraph(
                    "This report was generated by Clinical-NIDS AI Security System. " +
                    "All predictions are based on machine learning analysis and should be verified by security professionals.",
                    new Font(Font.HELVETICA, 8, Font.ITALIC, Color.GRAY)
            );
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("PDF generation failed", e);
            throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
        }
    }

    // ── Helper methods ────────────────────────────────────────────────

    private void addSection(Document document, String title) throws DocumentException {
        Paragraph section = new Paragraph(title, SECTION_FONT);
        section.setSpacingBefore(12);
        section.setSpacingAfter(8);
        document.add(section);
    }

    private void addSeparator(Document document) throws DocumentException {
        com.lowagie.text.pdf.draw.LineSeparator line = new com.lowagie.text.pdf.draw.LineSeparator();
        line.setLineColor(new Color(200, 200, 200));
        line.setLineWidth(0.5f);
        document.add(new Chunk(line));
        document.add(new Paragraph(" "));
    }

    private PdfPTable createInfoTable(int cols) throws DocumentException {
        PdfPTable table = new PdfPTable(cols);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{35, 65});
        return table;
    }

    private void addInfoRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setBorder(0);
        labelCell.setPadding(4);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, VALUE_FONT));
        valueCell.setBorder(0);
        valueCell.setPadding(4);
        table.addCell(valueCell);
    }

    private void addTableHeader(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_HEADER));
        cell.setBackgroundColor(new Color(30, 64, 175));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, VALUE_FONT));
        cell.setPadding(4);
        table.addCell(cell);
    }

    private String safe(String s) { return s != null ? s : "N/A"; }
    private long safeLong(Long v) { return v != null ? v : 0L; }
    private int safeInt(Integer v) { return v != null ? v : 0; }
    private double safeDouble(Double v) { return v != null ? v : 0.0; }
}
