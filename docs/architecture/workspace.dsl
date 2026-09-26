workspace "Campfire" "The digital companion for the leaders and the contingent management team of Scouterna's Swedish contingent to the World Scout Jamboree 2027." {

  model {
    !include model/people.dsl
    !include model/external.dsl
    !include model/services.dsl
    !include model/campfire.dsl
    !include model/deployment.dsl
  }

  views {
    !include views/context.dsl
    !include views/containers.dsl
    !include views/deployment.dsl

    # The styles live in their own file and are included here, because the grammar nests
    # styles inside views.
    styles {
      !include styles/styles.dsl
    }
  }

  configuration {
    # Declared, so the scope inspection passes rather than warning about an undefined
    # scope.
    scope softwaresystem
  }

  properties {
    # A relationship label is a verb phrase naming what one end does with the other, not
    # a protocol, so a technology on every relationship would add noise and no meaning.
    "structurizr.inspection.model.relationship.technology" "ignore"

    # Campfire's documentation and decisions are the guidebook and the decision log under
    # docs/, not documents embedded in this workspace.
    "structurizr.inspection.model.softwaresystem.documentation" "ignore"
    "structurizr.inspection.model.softwaresystem.decisions" "ignore"
  }
}
