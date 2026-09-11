workspace "Campfire" "The digital companion for the leaders and the contingent management team of Scouterna's Swedish contingent to the World Scout Jamboree 2027." {

  # The model is split by concern and assembled here: the people, the systems around
  # Campfire, the two back-end services, and Campfire itself with its containers and
  # every relationship between them. The views come next – one per file – and the
  # palette last.
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

    # The palette and the tag styles live in their own file, split by concern, and nest
    # in a styles block here because the DSL grammar nests styles inside views.
    styles {
      !include styles/styles.dsl
    }
  }

  configuration {
    # One software system in scope – Campfire, with its containers. A
    # software-system-scoped workspace, so the workspace.scope inspection passes rather
    # than warning about an undefined scope.
    scope softwaresystem
  }

  properties {
    # Relaxed inspection. A relationship label here is a verb phrase naming what one end
    # does with the other, not a protocol, so requiring a technology on every
    # relationship would add noise without adding meaning. Containers do carry a
    # technology, so that inspection stays on.
    "structurizr.inspection.model.relationship.technology" "ignore"

    # Relaxed inspection. The guidebook and the decision log under docs/ are Campfire's
    # documentation, not documentation embedded in this workspace, so the "system has
    # containers but no documentation / decisions" inspections do not apply.
    "structurizr.inspection.model.softwaresystem.documentation" "ignore"
    "structurizr.inspection.model.softwaresystem.decisions" "ignore"
  }
}
