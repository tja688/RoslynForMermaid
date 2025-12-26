using ArchRadar.Core.Models;
using ArchRadar.Core.Rules;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace ArchRadar.Core.Scanning;

public sealed class CSharpAuditWalker : CSharpSyntaxWalker
{
    private readonly AuditGraph _graph;
    private readonly TypeNameIndex _typeIndex;
    private readonly FeatureRuleEngine _featureRuleEngine;
    private readonly string _filePath;
    private readonly string? _projectRoot;
    private readonly string _featurePath;
    private readonly Stack<string> _typeStack = new();
    private readonly SemanticModel? _semanticModel;

    public CSharpAuditWalker(
        AuditGraph graph,
        TypeNameIndex typeIndex,
        FeatureRuleEngine featureRuleEngine,
        string filePath,
        string? projectRoot = null,
        SemanticModel? semanticModel = null)
        : base(SyntaxWalkerDepth.Node)
    {
        _graph = graph;
        _typeIndex = typeIndex;
        _featureRuleEngine = featureRuleEngine;
        _filePath = filePath;
        _projectRoot = projectRoot;
        _featurePath = NormalizeFeaturePath(projectRoot, filePath);
        _semanticModel = semanticModel;
    }

    public override void VisitClassDeclaration(ClassDeclarationSyntax node)
    {
        var namespaceName = GetEffectiveNamespace(node);
        var fullName = TryGetDeclaredSymbolName(node) ?? BuildFallbackFullName(node, namespaceName);

        var source = CreateSource(node);
        var featureKey = _featureRuleEngine.GetFeatureKey(_featurePath, namespaceName);
        var auditNode = new AuditNode
        {
            Id = fullName,
            Kind = AuditNodeKind.System,
            NameDisplay = fullName,
            FeatureKey = featureKey,
            Source = source
        };

        _graph.GetOrAddNode(auditNode);
        _typeIndex.Register(fullName, fullName);

        _typeStack.Push(fullName);
        base.VisitClassDeclaration(node);
        _typeStack.Pop();
    }

    public override void VisitInvocationExpression(InvocationExpressionSyntax node)
    {
        var fromId = CurrentTypeId;
        if (!string.IsNullOrWhiteSpace(fromId))
        {
            var targetText = node.Expression.ToString();
            var toId = ResolveInvocationTarget(node, targetText, out var confidence);
            var callSite = CreateCallSite(node, targetText);
            _graph.AddEdge(fromId!, toId, AuditEdgeKind.Calls, confidence, callSite);
        }

        base.VisitInvocationExpression(node);
    }

    public override void VisitObjectCreationExpression(ObjectCreationExpressionSyntax node)
    {
        var fromId = CurrentTypeId;
        if (!string.IsNullOrWhiteSpace(fromId))
        {
            var typeText = node.Type.ToString();
            var toId = ResolveCreationTarget(node, typeText, out var confidence);
            var callSite = CreateCallSite(node, typeText);
            _graph.AddEdge(fromId!, toId, AuditEdgeKind.Creates, confidence, callSite);
        }

        base.VisitObjectCreationExpression(node);
    }

    public override void VisitImplicitObjectCreationExpression(ImplicitObjectCreationExpressionSyntax node)
    {
        var fromId = CurrentTypeId;
        if (!string.IsNullOrWhiteSpace(fromId))
        {
            var targetText = node.ToString();
            var toId = EnsureUnresolvedNode(targetText);
            var callSite = CreateCallSite(node, targetText);
            _graph.AddEdge(fromId!, toId, AuditEdgeKind.Creates, AuditConfidence.Low, callSite);
        }

        base.VisitImplicitObjectCreationExpression(node);
    }

    private string? CurrentTypeId => _typeStack.Count > 0 ? _typeStack.Peek() : null;

    private string ResolveInvocationTarget(InvocationExpressionSyntax node, string targetText, out AuditConfidence confidence)
    {
        if (_semanticModel != null)
        {
            var symbol = _semanticModel.GetSymbolInfo(node).Symbol as IMethodSymbol;
            if (symbol != null)
            {
                var typeName = FormatSymbolName(symbol.ContainingType);
                return ResolveTypeTarget(typeName, AuditConfidence.High, out confidence);
            }
        }

        if (node.Expression is MemberAccessExpressionSyntax memberAccess
            && memberAccess.Expression is IdentifierNameSyntax identifier
            && _typeIndex.TryResolve(identifier.Identifier.Text, out var resolvedId))
        {
            confidence = AuditConfidence.Medium;
            return resolvedId;
        }

        confidence = AuditConfidence.Low;
        return EnsureUnresolvedNode(targetText);
    }

    private string ResolveCreationTarget(ObjectCreationExpressionSyntax node, string typeText, out AuditConfidence confidence)
    {
        if (_semanticModel != null)
        {
            var typeInfo = _semanticModel.GetTypeInfo(node);
            if (typeInfo.Type is INamedTypeSymbol namedType)
            {
                var typeName = FormatSymbolName(namedType);
                return ResolveTypeTarget(typeName, AuditConfidence.High, out confidence);
            }
        }

        return ResolveTypeTarget(typeText, AuditConfidence.Medium, out confidence);
    }

    private string ResolveTypeTarget(string typeText, AuditConfidence resolvedConfidence, out AuditConfidence confidence)
    {
        if (_typeIndex.TryResolve(typeText, out var resolvedId))
        {
            confidence = resolvedConfidence;
            return resolvedId;
        }

        confidence = AuditConfidence.Low;
        return EnsureUnresolvedNode(typeText);
    }

    private string EnsureUnresolvedNode(string text)
    {
        var unresolvedId = $"Unresolved::{text}";
        var unresolvedNode = new AuditNode
        {
            Id = unresolvedId,
            Kind = AuditNodeKind.Unresolved,
            NameDisplay = text,
            FeatureKey = "Unresolved"
        };

        _graph.GetOrAddNode(unresolvedNode);
        return unresolvedId;
    }

    private AuditSource CreateSource(SyntaxNode node)
    {
        var span = node.GetLocation().GetLineSpan();
        return new AuditSource(_filePath, span.StartLinePosition.Line + 1, span.StartLinePosition.Character + 1);
    }

    private AuditCallSite CreateCallSite(SyntaxNode node, string snippet)
    {
        var span = node.GetLocation().GetLineSpan();
        return new AuditCallSite(_filePath, span.StartLinePosition.Line + 1, span.StartLinePosition.Character + 1, snippet);
    }

    private string? TryGetDeclaredSymbolName(ClassDeclarationSyntax node)
    {
        if (_semanticModel == null)
        {
            return null;
        }

        var symbol = _semanticModel.GetDeclaredSymbol(node) as INamedTypeSymbol;
        if (symbol == null)
        {
            return null;
        }

        return FormatSymbolName(symbol);
    }

    private static string BuildFallbackFullName(ClassDeclarationSyntax node, string? namespaceName)
    {
        var typeName = GetTypeName(node);
        return string.IsNullOrWhiteSpace(namespaceName)
            ? $"global::{typeName}"
            : $"{namespaceName}.{typeName}";
    }

    private static string GetTypeName(ClassDeclarationSyntax node)
    {
        var names = new Stack<string>();
        names.Push(node.Identifier.Text);

        for (SyntaxNode? current = node.Parent; current != null; current = current.Parent)
        {
            if (current is ClassDeclarationSyntax parentClass)
            {
                names.Push(parentClass.Identifier.Text);
            }
        }

        return string.Join(".", names);
    }

    private string? GetEffectiveNamespace(ClassDeclarationSyntax node)
    {
        var semanticNamespace = TryGetDeclaredNamespace(node);
        if (!string.IsNullOrWhiteSpace(semanticNamespace))
        {
            return semanticNamespace;
        }

        return GetNamespaceName(node);
    }

    private string? TryGetDeclaredNamespace(ClassDeclarationSyntax node)
    {
        if (_semanticModel == null)
        {
            return null;
        }

        var symbol = _semanticModel.GetDeclaredSymbol(node) as INamedTypeSymbol;
        if (symbol == null)
        {
            return null;
        }

        var ns = symbol.ContainingNamespace?.ToDisplayString();
        return string.IsNullOrWhiteSpace(ns) ? null : ns;
    }

    private static string? GetNamespaceName(SyntaxNode node)
    {
        var parts = new Stack<string>();
        for (SyntaxNode? current = node.Parent; current != null; current = current.Parent)
        {
            if (current is NamespaceDeclarationSyntax ns)
            {
                parts.Push(ns.Name.ToString());
            }
            else if (current is FileScopedNamespaceDeclarationSyntax fileScoped)
            {
                parts.Push(fileScoped.Name.ToString());
            }
        }

        return parts.Count == 0 ? null : string.Join(".", parts);
    }

    private static string FormatSymbolName(INamedTypeSymbol symbol)
    {
        var display = symbol.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);
        return display.StartsWith("global::", StringComparison.Ordinal)
            ? display[8..]
            : display;
    }

    private static string NormalizeFeaturePath(string? projectRoot, string filePath)
    {
        if (string.IsNullOrWhiteSpace(projectRoot))
        {
            return filePath.Replace('\\', '/');
        }

        var fullRoot = Path.GetFullPath(projectRoot);
        var fullFile = Path.GetFullPath(filePath);
        var relative = Path.GetRelativePath(fullRoot, fullFile);
        return relative.Replace('\\', '/');
    }
}
